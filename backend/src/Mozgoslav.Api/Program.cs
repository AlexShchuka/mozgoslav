using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;

using Mozgoslav.Api.Endpoints;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Configuration;
using Mozgoslav.Infrastructure.Jobs;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Rag;
using Mozgoslav.Infrastructure.Repositories;
using Mozgoslav.Infrastructure.Seed;
using Mozgoslav.Infrastructure.Services;

using OpenTelemetry.Metrics;

using Quartz;

using Serilog;
using Serilog.Events;

AppPaths.EnsureExist();

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithProcessId()
    .Enrich.WithThreadId()
    .WriteTo.Console()
    .WriteTo.File(
        path: Path.Combine(AppPaths.Logs, "mozgoslav-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // Host URL binding lives in appsettings.json ("Urls") — single source of
    // truth so an operator can override via env var / command-line without
    // touching code. ConfigureKestrel is intentionally omitted here to avoid
    // the Kestrel "Overriding address(es)" warning that appears when both
    // sources are set (ADR-007 BC-052, bug 8).

    const string DevelopmentCorsPolicy = "MozgoslavDev";
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(DevelopmentCorsPolicy, policy => policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "app://mozgoslav")
            .AllowAnyHeader()
            .AllowAnyMethod());
    });

    builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 2L * 1024 * 1024 * 1024);

    // --- EF Core DbContext ---
    // AppPaths.Database is the canonical location. Mozgoslav:DatabasePath (env
    // var / appsettings) is an override for tests and advanced ops; we log a
    // WARN whenever it is set so dev environments never silently drift.
    var databasePathOverride = builder.Configuration["Mozgoslav:DatabasePath"];
    var databasePath = string.IsNullOrWhiteSpace(databasePathOverride)
        ? AppPaths.Database
        : databasePathOverride;
    if (!string.IsNullOrWhiteSpace(databasePathOverride))
    {
        Log.Warning(
            "Mozgoslav:DatabasePath override is active — using {DbPath} instead of canonical {CanonicalPath}",
            databasePathOverride,
            AppPaths.Database);
    }
    else
    {
        Log.Information("Using database at {DbPath}", databasePath);
    }
    var connectionString = $"Data Source={databasePath}";

    builder.Services.AddDbContextFactory<MozgoslavDbContext>(options => options.UseSqlite(connectionString));
    builder.Services.AddDbContext<MozgoslavDbContext>((_, options) => options.UseSqlite(connectionString),
        contextLifetime: ServiceLifetime.Scoped,
        optionsLifetime: ServiceLifetime.Singleton);

    builder.Services.AddScoped<IRecordingRepository, EfRecordingRepository>();
    builder.Services.AddScoped<ITranscriptRepository, EfTranscriptRepository>();
    builder.Services.AddScoped<IProcessedNoteRepository, EfProcessedNoteRepository>();
    builder.Services.AddScoped<IProfileRepository, EfProfileRepository>();
    builder.Services.AddScoped<IProcessingJobRepository, EfProcessingJobRepository>();

    builder.Services.AddSingleton<IAppSettings, EfAppSettings>();

    // --- Application services ---
    builder.Services.AddScoped<CorrectionService>();
    // Plan v0.8 Block 5 — glossary + LLM-correction stages.
    builder.Services.AddSingleton<GlossaryApplicator>();
    builder.Services.AddScoped<LlmCorrectionService>();
    builder.Services.AddScoped<ImportRecordingUseCase>();
    builder.Services.AddScoped<ReprocessUseCase>();
    // ADR-011 step 6 — ProcessQueueWorker no longer drives its own loop; it is
    // invoked once per Quartz trigger by ProcessRecordingQuartzJob.
    builder.Services.AddScoped<ProcessQueueWorker>();
    builder.Services.AddSingleton<IProcessingJobScheduler, QuartzProcessingJobScheduler>();
    // ADR-015 — singleton so the cancel endpoint and the queue worker share
    // the same map of active per-job cancellation token sources.
    builder.Services.AddSingleton<IJobCancellationRegistry, JobCancellationRegistry>();

    // --- Infrastructure services ---
    builder.Services.AddHttpClient();
    // ADR-011 step 3 — Microsoft.Extensions.Http.Resilience is applied to every
    // outbound HTTP client the backend owns. Settings follow the ADR: 30 s total
    // timeout, retry 3 with exponential backoff, circuit-breaker trips after 5
    // failures inside a 30 s window. The only exception is
    // OpenAiCompatibleLlmProvider, which uses the OpenAI SDK's own pipeline and
    // cannot share the named "llm" HttpClient — its retry/backoff is delegated
    // to the SDK until a future MR replaces the SDK with raw HttpClient.
    static void ConfigureStandardResilience(HttpStandardResilienceOptions options)
    {
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
        options.Retry.MaxRetryAttempts = 3;
        options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
        options.Retry.Delay = TimeSpan.FromSeconds(1);
        options.Retry.UseJitter = true;
        options.CircuitBreaker.FailureRatio = 0.5;
        options.CircuitBreaker.MinimumThroughput = 5;
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
    }
    // Named "llm" client — used by Anthropic + Ollama transports and the
    // OpenAiCompatibleLlmService health probe. NOT by OpenAiCompatibleLlmProvider
    // (that path routes through the OpenAI SDK's own handler pipeline).
    builder.Services.AddHttpClient("llm")
        .AddStandardResilienceHandler(ConfigureStandardResilience);
    // Named "models" client — bulk downloads from HuggingFace. Keep the
    // per-call 30 min timeout set on the resolved HttpClient so multi-GB
    // downloads succeed; the resilience handler only covers retry + circuit
    // breaker (the 30 s total-request timeout is explicitly overridden by the
    // ModelDownloadService for the streaming case, see that file).
    builder.Services.AddHttpClient("models", client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozgoslav/1.0");
        })
        .AddStandardResilienceHandler(options =>
        {
            // ADR-011 step 9 — the bespoke retry loop in ModelDownloadService is
            // replaced by HttpResilience's retry + circuit-breaker. Per-attempt
            // budget is generous (30 min) so multi-GB HuggingFace transfers
            // never time out mid-download; retries back off exponentially. The
            // circuit-breaker sampling duration must be ≥ 2× attempt timeout
            // (Polly validation), so at 30 min/attempt we use 90 min.
            options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(90);
            options.AttemptTimeout.Timeout = TimeSpan.FromMinutes(30);
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
            options.Retry.Delay = TimeSpan.FromSeconds(2);
            options.Retry.UseJitter = true;
            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.MinimumThroughput = 5;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(60);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
        });
    builder.Services.AddSingleton<IJobProgressNotifier, ChannelJobProgressNotifier>();
    builder.Services.AddSingleton<IAudioConverter, FfmpegAudioConverter>();
    // D4 — Dashboard record button posts Opus-in-WebM chunks; a per-session
    // long-running ffmpeg decoder turns the continuous stream into 16 kHz
    // float32 mono PCM. A one-shot decoder cannot handle header-less
    // continuation chunks (exit 183), hence IDictationPcmStream replaces the
    // old IAudioPcmDecoder.
    builder.Services.AddSingleton<IDictationPcmStream, FfmpegPcmStreamService>();
    builder.Services.AddSingleton<IVadPreprocessor, SileroVadPreprocessor>();
    // ADR-011 step 2 — IMemoryCache replaces the homebrew IdleResourceCache<T>.
    // The Whisper factory entry is created lazily by WhisperNetTranscriptionService
    // with SlidingExpiration = DictationModelUnloadMinutes and a
    // PostEvictionCallback that Dispose()s the factory when the idle window elapses.
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<WhisperNetTranscriptionService>();
    builder.Services.AddSingleton<ITranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<IStreamingTranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    // BC-036 multi-provider LLM. Register each provider once against the
    // ILlmProvider port; the factory picks the active one based on
    // IAppSettings.LlmProvider. OpenAiCompatibleLlmService stays the upstream
    // adapter (chunking + JSON repair) and routes transport through the factory.
    builder.Services.AddSingleton<ILlmProvider, OpenAiCompatibleLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, AnthropicLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, OllamaLlmProvider>();
    builder.Services.AddSingleton<ILlmProviderFactory, LlmProviderFactory>();
    builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
    builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
    // ADR-009 §2.1 row 1 — platform-aware recorder registration.
    // macOS: AVFoundationAudioRecorder talks to the Swift helper via the
    // Electron loopback bridge. Port is resolved from
    // Mozgoslav:AudioRecorder:ElectronBridgePort in configuration (env-var
    // override: Mozgoslav__AudioRecorder__ElectronBridgePort, populated by
    // frontend/electron/utils/backendLauncher.ts).
    // Linux/Windows: PlatformUnsupportedAudioRecorder honestly gates the
    // feature (IsSupported=false) — UI hides the Record button accordingly.
    builder.Services.Configure<AudioRecorderOptions>(
        builder.Configuration.GetSection(AudioRecorderOptions.SectionName));
    if (OperatingSystem.IsMacOS())
    {
        builder.Services.AddHttpClient<AVFoundationAudioRecorder>(client =>
            client.Timeout = TimeSpan.FromSeconds(30));
        builder.Services.AddSingleton<IAudioRecorder>(sp =>
            sp.GetRequiredService<AVFoundationAudioRecorder>());
    }
    else
    {
        builder.Services.AddSingleton<IAudioRecorder, PlatformUnsupportedAudioRecorder>();
    }
    builder.Services.AddSingleton<IPerAppCorrectionProfiles, InMemoryPerAppCorrectionProfiles>();
    builder.Services.AddSingleton<IDictationSessionManager, DictationSessionManager>();
    builder.Services.AddScoped<MeetilyImporterService>();
    builder.Services.AddScoped<ObsidianSetupService>();
    // ADR-007-shared §2.6 BC-025 — bulk export + PARA layout surfaces used by
    // the Obsidian endpoints. Scoped because the bulk exporter pulls scoped
    // repositories (IProcessedNoteRepository, IProfileRepository, …).
    builder.Services.AddScoped<IObsidianExportService, ObsidianBulkExportService>();
    builder.Services.AddScoped<IObsidianLayoutService, ObsidianLayoutService>();
    // Plan v0.8 Block 6 — Obsidian Local REST API client. The named HttpClient
    // pins the localhost-scoped cert validation callback so the plugin's
    // self-signed certificate does not break on the first request. Production
    // code paths call `IsReachableAsync` first and fall back to file-I/O, so a
    // missing plugin or wrong token never crashes the pipeline.
    builder.Services.AddHttpClient(ObsidianRestApiClient.HttpClientName)
        .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (request, _, _, _) =>
            {
                var host = request.RequestUri?.Host;
                return host is "127.0.0.1" or "localhost";
            },
        });
    builder.Services.AddScoped<IObsidianRestClient, ObsidianRestApiClient>();
    builder.Services.AddSingleton<ModelDownloadService>();
    builder.Services.AddSingleton<IModelDownloadCoordinator, ModelDownloadCoordinator>();
    builder.Services.AddSingleton<BackupService>();
    builder.Services.AddSingleton<MozgoslavMetrics>();
    builder.Services.AddSingleton<SyncthingConfigService>();

    // --- ADR-005 RAG stack ---
    // Bag-of-words is the zero-dependency fallback; production points
    // ``Mozgoslav:PythonSidecar:BaseUrl`` at the sidecar so we get
    // sentence-transformer vectors with graceful degradation on outage.
    builder.Services.AddSingleton<BagOfWordsEmbeddingService>(_ => new BagOfWordsEmbeddingService());
    var sidecarBaseUrl = builder.Configuration["Mozgoslav:PythonSidecar:BaseUrl"];
    if (!string.IsNullOrWhiteSpace(sidecarBaseUrl))
    {
        const string SidecarClientName = "Mozgoslav.PythonSidecar";
        // ADR-011 step 3 — resilience handler owns timeouts + retry. The sidecar
        // runs model inference that can be slow, so per-attempt timeout is 30 s
        // and total timeout is 2 min (covers one cold-start + three retries).
        builder.Services.AddHttpClient(SidecarClientName, client =>
        {
            client.BaseAddress = new Uri(sidecarBaseUrl);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(2);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(30);
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
            options.Retry.Delay = TimeSpan.FromSeconds(1);
            options.Retry.UseJitter = true;
            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.MinimumThroughput = 5;
            // Polly validation: SamplingDuration >= 2 * AttemptTimeout (30 s).
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(1);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
        });
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            new PythonSidecarEmbeddingService(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
                sp.GetRequiredService<BagOfWordsEmbeddingService>(),
                sp.GetRequiredService<ILogger<PythonSidecarEmbeddingService>>()));
        // The same sidecar also serves diarize/ner/gender/emotion. One
        // typed client per endpoint would be overkill — we reuse the
        // named HttpClient and register IPythonSidecarClient against it.
        builder.Services.AddSingleton<IPythonSidecarClient>(sp =>
            new PythonSidecarClient(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
                sp.GetRequiredService<ILogger<PythonSidecarClient>>()));
    }
    else
    {
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            sp.GetRequiredService<BagOfWordsEmbeddingService>());
        // No sidecar configured — IPythonSidecarClient stays unregistered.
        // Callers that need it must opt-in via config; the queue worker
        // and dictation polish pipelines currently do not depend on it
        // so the missing registration is a no-op.
    }
    // Default: in-memory index. Flip ``Mozgoslav:Rag:Persist=true`` to use
    // the SQLite-backed store so the vector index survives restarts. The
    // backend uses brute-force cosine on both paths; swap in ``sqlite-vss``
    // via the same interface when the native extension is bundled.
    var persistRag = builder.Configuration.GetValue<bool>("Mozgoslav:Rag:Persist");
    if (persistRag)
    {
        builder.Services.AddSingleton<IVectorIndex>(_ => new SqliteVectorIndex(connectionString));
    }
    else
    {
        builder.Services.AddSingleton<IVectorIndex, InMemoryVectorIndex>();
    }
    builder.Services.AddSingleton<IRagService, RagService>();

    // ADR-007 bug 6 spot-fix — Syncthing REST client is only wired when a base
    // address is explicitly configured (the Electron lifecycle service sets it
    // once the bundled binary reports its random port + api-key). When unset,
    // we register a no-op DisabledSyncthingClient so /api/sync/* returns
    // empty payloads and there is no "Connection refused (127.0.0.1:8384)"
    // log spam on every boot. Full lifecycle lands in Phase 2 Backend MR D.
    var syncthingBaseUrl = builder.Configuration["Mozgoslav:SyncthingBaseUrl"];
    if (!string.IsNullOrWhiteSpace(syncthingBaseUrl))
    {
        builder.Services.AddHttpClient<ISyncthingClient, SyncthingHttpClient>(client =>
        {
            client.BaseAddress = new Uri(syncthingBaseUrl);
            var apiKey = builder.Configuration["Mozgoslav:SyncthingApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
            }
        });
    }
    else
    {
        builder.Services.AddSingleton<ISyncthingClient, DisabledSyncthingClient>();
    }

    builder.Services.AddOpenTelemetry().WithMetrics(m => m
        .AddMeter(MozgoslavMetrics.MeterName)
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation());

    builder.Services.AddHostedService<DatabaseInitializer>();
    // ADR-011 step 6 — Quartz.NET replaces the custom QueueBackgroundService
    // polling loop. Job recovery uses Quartz's RequestsRecovery flag plus a
    // ProcessingJobRehydrator hosted service that re-schedules any
    // non-terminal ProcessingJob rows on startup (replaces the legacy
    // ReconcileAsync mechanism). RAMJobStore is used because the durable
    // business-state lives in the `processing_jobs` table and the rehydrator
    // handles crash recovery — a separate Quartz JobStore would duplicate
    // that state without adding a guarantee.
    builder.Services.AddQuartz(q =>
    {
        q.AddJob<ProcessRecordingQuartzJob>(jobConfig => jobConfig
            .StoreDurably()
            .RequestRecovery()
            .WithIdentity("process-recording-template", ProcessRecordingQuartzJob.JobGroup));
    });
    builder.Services.AddQuartzHostedService(options =>
    {
        options.WaitForJobsToComplete = true;
        options.AwaitApplicationStarted = true;
    });
    // Rehydrator runs AFTER DatabaseInitializer (migrations complete) and
    // AFTER the Quartz hosted service (scheduler started). The hosted service
    // registration order here is deliberate: DatabaseInitializer first,
    // Quartz next (above), rehydrator last.
    builder.Services.AddHostedService<ProcessingJobRehydrator>();
    builder.Services.AddHostedService<SyncthingVersioningVerifier>();
    // ADR-007-phase2-backend §2.3 — real lifecycle service replaces the
    // Phase-1 NotYetWired stub. When the bundled Syncthing binary is absent
    // (pod sandbox / dev box without Electron wrapper) the service logs an
    // INF line once and becomes a no-op; no log spam, no startup blockage.
    builder.Services.AddHostedService<SyncthingLifecycleService>();

    // ADR-007 D5 / bug 9 — Logs is the single MVC controller surface. The rest
    // of the modules stay Minimal API. Coexistence is explicit (one directive,
    // not a policy).
    builder.Services.AddControllers();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors(DevelopmentCorsPolicy);

    app.MapControllers();

    app.MapHealthEndpoints();
    app.MapRecordingEndpoints();
    app.MapJobEndpoints();
    app.MapNoteEndpoints();
    app.MapProfileEndpoints();
    app.MapSettingsEndpoints();
    app.MapModelEndpoints();
    app.MapMeetilyEndpoints();
    app.MapObsidianEndpoints();
    app.MapSseEndpoints();
    app.MapBackupEndpoints();
    app.MapDictationEndpoints();
    app.MapSyncEndpoints();
    app.MapRagEndpoints();
    app.MapMetaEndpoints();

    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Mozgoslav backend terminated unexpectedly");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}

public abstract partial class Program;
