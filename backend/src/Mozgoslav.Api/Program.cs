using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

using Mozgoslav.Api.BackgroundServices;
using Mozgoslav.Api.Endpoints;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Rag;
using Mozgoslav.Infrastructure.Repositories;
using Mozgoslav.Infrastructure.Seed;
using Mozgoslav.Infrastructure.Services;

using OpenTelemetry.Metrics;

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
    builder.Services.AddScoped<ImportRecordingUseCase>();
    builder.Services.AddScoped<ReprocessUseCase>();
    builder.Services.AddScoped<ProcessQueueWorker>();

    // --- Infrastructure services ---
    builder.Services.AddHttpClient();
    builder.Services.AddSingleton<IJobProgressNotifier, ChannelJobProgressNotifier>();
    builder.Services.AddSingleton<IAudioConverter, FfmpegAudioConverter>();
    // ADR-007 BC-004 — Dashboard record button posts Opus-in-WebM chunks; the
    // decoder turns them into the same 16 kHz float32 mono PCM the streaming
    // transcription service already accepts.
    builder.Services.AddSingleton<IAudioPcmDecoder, FfmpegPcmDecoder>();
    builder.Services.AddSingleton<IVadPreprocessor, SileroVadPreprocessor>();
    // ADR-004 R4 / ADR-007-phase2-backend §2.4 Step 2 — the WhisperFactory cache is
    // now an injected port; the factory delegate resolves the configured model path
    // on first use and throws a helpful error if it is missing from disk.
    builder.Services.AddSingleton<IIdleResourceCache<Whisper.net.WhisperFactory>>(sp =>
    {
        var settings = sp.GetRequiredService<IAppSettings>();
        var logger = sp.GetRequiredService<ILogger<IdleResourceCache<Whisper.net.WhisperFactory>>>();
        return new IdleResourceCache<Whisper.net.WhisperFactory>(
            factory: () =>
            {
                var modelPath = settings.WhisperModelPath;
                if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
                {
                    throw new InvalidOperationException(
                        $"Whisper model is not configured or missing on disk: '{modelPath}'. " +
                        "Download it via the Models page in Settings.");
                }
                logger.LogInformation("Loading Whisper model {Model}", Path.GetFileName(modelPath));
                return Whisper.net.WhisperFactory.FromPath(modelPath);
            },
            idleTimeoutProvider: () =>
                TimeSpan.FromMinutes(Math.Max(0, settings.DictationModelUnloadMinutes)));
    });
    builder.Services.AddSingleton<WhisperNetTranscriptionService>();
    builder.Services.AddSingleton<ITranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<IStreamingTranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    // TODO-3 / BC-036 — multi-provider LLM. Register each provider once against
    // the ILlmProvider port; the factory picks the active one based on
    // IAppSettings.LlmProvider. OpenAiCompatibleLlmService stays the upstream
    // adapter (chunking + JSON repair) and routes transport through the factory.
    builder.Services.AddSingleton<ILlmProvider, OpenAiCompatibleLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, AnthropicLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, OllamaLlmProvider>();
    builder.Services.AddSingleton<ILlmProviderFactory, LlmProviderFactory>();
    builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
    builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
    builder.Services.AddSingleton<IAudioRecorder, NoopAudioRecorder>();
    builder.Services.AddSingleton<IPerAppCorrectionProfiles, InMemoryPerAppCorrectionProfiles>();
    builder.Services.AddSingleton<IDictationSessionManager, DictationSessionManager>();
    builder.Services.AddScoped<MeetilyImporterService>();
    builder.Services.AddScoped<ObsidianSetupService>();
    // ADR-007-shared §2.6 BC-025 — bulk export + PARA layout surfaces used by
    // the Obsidian endpoints. Scoped because the bulk exporter pulls scoped
    // repositories (IProcessedNoteRepository, IProfileRepository, …).
    builder.Services.AddScoped<IObsidianExportService, ObsidianBulkExportService>();
    builder.Services.AddScoped<IObsidianLayoutService, ObsidianLayoutService>();
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
        builder.Services.AddHttpClient(SidecarClientName, client =>
        {
            client.BaseAddress = new Uri(sidecarBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            new PythonSidecarEmbeddingService(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
                sp.GetRequiredService<BagOfWordsEmbeddingService>(),
                sp.GetRequiredService<ILogger<PythonSidecarEmbeddingService>>()));
    }
    else
    {
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            sp.GetRequiredService<BagOfWordsEmbeddingService>());
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
    builder.Services.AddHostedService<QueueBackgroundService>();
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
