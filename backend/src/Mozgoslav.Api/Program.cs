using System;
using System.IO;
using System.Net.Http;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Logging;

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

    builder.Services.AddSingleton<DiagnosticsSaveChangesInterceptor>();

    void ConfigureDbContext(IServiceProvider sp, DbContextOptionsBuilder options)
    {
        options.UseSqlite(connectionString);
        options.AddInterceptors(sp.GetRequiredService<DiagnosticsSaveChangesInterceptor>());
        options.EnableDetailedErrors();
        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
        }
    }

    builder.Services.AddDbContextFactory<MozgoslavDbContext>(ConfigureDbContext);
    builder.Services.AddDbContext<MozgoslavDbContext>(
        ConfigureDbContext,
        contextLifetime: ServiceLifetime.Scoped,
        optionsLifetime: ServiceLifetime.Singleton);

    builder.Services.AddScoped<IRecordingRepository, EfRecordingRepository>();
    builder.Services.AddScoped<ITranscriptRepository, EfTranscriptRepository>();
    builder.Services.AddScoped<EfProcessedNoteRepository>();
    builder.Services.AddScoped<IProcessedNoteRepository>(sp =>
        new RagIndexingProcessedNoteRepository(
            sp.GetRequiredService<EfProcessedNoteRepository>(),
            sp.GetRequiredService<IRagService>(),
            sp.GetRequiredService<ILogger<RagIndexingProcessedNoteRepository>>()));
    builder.Services.AddScoped<IProfileRepository, EfProfileRepository>();
    builder.Services.AddScoped<IProcessingJobRepository, EfProcessingJobRepository>();

    builder.Services.AddSingleton<IAppSettings, EfAppSettings>();

    builder.Services.AddScoped<CorrectionService>();
    builder.Services.AddSingleton<GlossaryApplicator>();
    builder.Services.AddScoped<LlmCorrectionService>();
    builder.Services.AddScoped<ImportRecordingUseCase>();
    builder.Services.AddScoped<ReprocessUseCase>();
    builder.Services.AddScoped<ProcessQueueWorker>();
    builder.Services.AddSingleton<IProcessingJobScheduler, QuartzProcessingJobScheduler>();
    builder.Services.AddSingleton<IJobCancellationRegistry, JobCancellationRegistry>();

    builder.Services.AddHttpClient();
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
    builder.Services.AddHttpClient("llm")
        .AddStandardResilienceHandler(ConfigureStandardResilience);
    builder.Services.AddHttpClient("models", client =>
        {
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozgoslav/1.0");
        })
        .AddStandardResilienceHandler(options =>
        {
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
    builder.Services.AddSingleton<IAudioDeviceChangeNotifier, ChannelAudioDeviceChangeNotifier>();
    builder.Services.AddSingleton<IHotkeyEventNotifier, ChannelHotkeyEventNotifier>();
    builder.Services.AddSingleton<IAudioConverter, FfmpegAudioConverter>();
    builder.Services.AddSingleton<IAudioMetadataProbe, FfprobeAudioMetadataProbe>();
    builder.Services.AddSingleton<IDictationPcmStream, FfmpegPcmStreamService>();
    builder.Services.AddSingleton<IVadPreprocessor, SileroVadPreprocessor>();
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<WhisperNetTranscriptionService>();
    builder.Services.AddSingleton<ITranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<IStreamingTranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<ILlmProvider, OpenAiCompatibleLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, AnthropicLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, OllamaLlmProvider>();
    builder.Services.AddSingleton<ILlmProviderFactory, LlmProviderFactory>();
    builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
    builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
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
    builder.Services.AddScoped<IObsidianExportService, ObsidianBulkExportService>();
    builder.Services.AddScoped<IObsidianLayoutService, ObsidianLayoutService>();
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

    builder.Services.AddSingleton<BagOfWordsEmbeddingService>(_ => new BagOfWordsEmbeddingService());
    var sidecarBaseUrl = builder.Configuration["Mozgoslav:PythonSidecar:BaseUrl"];
    if (!string.IsNullOrWhiteSpace(sidecarBaseUrl))
    {
        const string SidecarClientName = "Mozgoslav.PythonSidecar";
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
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(1);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
        });
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            new PythonSidecarEmbeddingService(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
                sp.GetRequiredService<BagOfWordsEmbeddingService>(),
                sp.GetRequiredService<ILogger<PythonSidecarEmbeddingService>>()));
        builder.Services.AddSingleton<IPythonSidecarClient>(sp =>
            new PythonSidecarClient(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
                sp.GetRequiredService<ILogger<PythonSidecarClient>>()));
    }
    else
    {
        builder.Services.AddSingleton<IEmbeddingService>(sp =>
            sp.GetRequiredService<BagOfWordsEmbeddingService>());
    }
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
    builder.Services.AddHostedService<ProcessingJobRehydrator>();
    builder.Services.AddHostedService<SyncthingVersioningVerifier>();
    builder.Services.AddHostedService<SyncthingLifecycleService>();

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
