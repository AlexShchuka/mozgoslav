using System;
using System.IO;
using System.Net.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Mozgoslav.Api.Endpoints;
using Mozgoslav.Api.GraphQL;
using Mozgoslav.Api.GraphQL.Jobs;
using Mozgoslav.Api.GraphQL.Monitoring;
using Mozgoslav.Api.GraphQL.SchemaExport;
using Mozgoslav.Api.Services;
using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;
using Mozgoslav.Application.Monitoring;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Prompts;
using Mozgoslav.Application.Rag;
using Mozgoslav.Application.Routines;
using Mozgoslav.Application.Search;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Application.WebSearch;
using Mozgoslav.Infrastructure.Agents;
using Mozgoslav.Infrastructure.Agents.Skills;
using Mozgoslav.Infrastructure.Configuration;
using Mozgoslav.Infrastructure.Hosting;
using Mozgoslav.Infrastructure.Jobs;
using Mozgoslav.Infrastructure.Mcp.Tools;
using Mozgoslav.Infrastructure.Monitoring;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Obsidian;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Prompts;
using Mozgoslav.Infrastructure.Rag;
using Mozgoslav.Infrastructure.Repositories;
using Mozgoslav.Infrastructure.Routines;
using Mozgoslav.Infrastructure.Search;
using Mozgoslav.Infrastructure.Search.Tools;
using Mozgoslav.Infrastructure.Seed;
using Mozgoslav.Infrastructure.Services;
using Mozgoslav.Infrastructure.SystemActions;
using Mozgoslav.Infrastructure.WebSearch;
using Mozgoslav.Native.V1;
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
    builder.Services.AddScoped<IProcessingJobStageRepository, EfProcessingJobStageRepository>();

    builder.Services.AddSingleton<IAppSettings, EfAppSettings>();

    builder.Services.AddScoped<CorrectionService>();
    builder.Services.AddSingleton<GlossaryApplicator>();
    builder.Services.AddScoped<LlmCorrectionService>();
    builder.Services.AddScoped<ImportRecordingUseCase>();
    builder.Services.AddScoped<RecordingFinaliser>();
    builder.Services.AddScoped<ReprocessUseCase>();
    builder.Services.AddScoped<SuggestGlossaryTermsUseCase>();
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
    builder.Services.AddSingleton<IRecordingPartialsNotifier, ChannelRecordingPartialsNotifier>();
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
    builder.Services.AddSingleton<IModelCatalogService, OpenAiCompatibleModelCatalogService>();
    builder.Services.AddSingleton<ILlmCapabilitiesCache, InMemoryLlmCapabilitiesCache>();
    builder.Services.AddTransient<ILlmCapabilitiesProbe, OpenAiCompatibleCapabilitiesProbe>();
    builder.Services.AddHostedService<LlmCapabilitiesStartupProbe>();
    builder.Services.AddSingleton<SyncthingDetectionService>();
    builder.Services.AddSingleton<IRuntimeStateProvider, RuntimeStateProvider>();
    builder.Services.AddHttpContextAccessor();
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

    builder.Services.Configure<NativeHelperOptions>(
        builder.Configuration.GetSection(NativeHelperOptions.SectionName));

    if (OperatingSystem.IsMacOS())
    {
        builder.Services.AddGrpcClient<DictationHelper.DictationHelperClient>((sp, options) =>
        {
            var cfg = sp.GetRequiredService<IOptions<NativeHelperOptions>>().Value;
            options.Address = new Uri(cfg.GrpcEndpoint);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
            options.Retry.MaxRetryAttempts = 2;
        });

        builder.Services.AddSingleton<INativeHelperClient, GrpcNativeHelperClient>();
        builder.Services.AddSingleton<ISystemAction, AppleShortcutsProvider>();
        builder.Services.AddSingleton<ISystemActionTemplateProvider, AppleShortcutTemplateProvider>();
    }
    else
    {
        builder.Services.AddSingleton<INativeHelperClient, NoOpNativeHelperClient>();
        builder.Services.AddSingleton<ISystemAction, NoOpSystemAction>();
        builder.Services.AddSingleton<ISystemActionTemplateProvider, AppleShortcutTemplateProvider>();
    }
    builder.Services.AddSingleton<IPerAppCorrectionProfiles, InMemoryPerAppCorrectionProfiles>();
    builder.Services.AddSingleton<IDictationSessionManager, DictationSessionManager>();
    builder.Services.AddScoped<MeetilyImporterService>();
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
    builder.Services.AddSingleton<IVaultBootstrapProvider, EmbeddedVaultBootstrap>();
    builder.Services.AddScoped<IVaultDriver, FileSystemVaultDriver>();
    builder.Services.AddSingleton<IDomainEventBus, ChannelDomainEventBus>();
    builder.Services.AddHostedService<ObsidianDomainEventConsumer>();
    builder.Services.AddHttpClient(GitHubPluginInstaller.HttpClientName);
    builder.Services.AddScoped<IPluginInstaller, GitHubPluginInstaller>();
    builder.Services.AddScoped<IVaultDiagnostics, VaultDiagnosticsService>();
    builder.Services.AddScoped<VaultSidecarOrchestrator>();
    builder.Services.AddSingleton(_ => PinnedPluginsLoader.LoadFromEmbeddedResource());
    builder.Services.Configure<ModelDownloadCoordinatorOptions>(
        builder.Configuration.GetSection(ModelDownloadCoordinatorOptions.SectionName));
    builder.Services.AddSingleton<ModelDownloadService>();
    builder.Services.AddSingleton<IDownloadJobRepository, EfDownloadJobRepository>();
    builder.Services.AddSingleton<IModelDownloadCoordinator, ModelDownloadCoordinator>();
    builder.Services.AddSingleton<BackupService>();
    builder.Services.AddSingleton<RecordingSessionRegistry>();
    builder.Services.AddSingleton<MozgoslavMetrics>();
    builder.Services.AddSingleton<IObsidianMetricsSink, ObsidianMetricsSink>();
    builder.Services.AddSingleton<SyncthingConfigService>();

    var sidecarBaseUrl = builder.Configuration["Mozgoslav:PythonSidecar:BaseUrl"];
    if (string.IsNullOrWhiteSpace(sidecarBaseUrl))
    {
        Log.Error(
            "Mozgoslav:PythonSidecar:BaseUrl is not configured. " +
            "RAG embedding and reranking require the python-sidecar. " +
            "Start the sidecar and set this configuration value.");
    }

    const string SidecarClientName = "Mozgoslav.PythonSidecar";
    builder.Services.AddHttpClient(SidecarClientName, client =>
    {
        if (!string.IsNullOrWhiteSpace(sidecarBaseUrl))
        {
            client.BaseAddress = new Uri(sidecarBaseUrl);
        }
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
            sp.GetRequiredService<ILogger<PythonSidecarEmbeddingService>>()));
    builder.Services.AddSingleton<IPythonSidecarClient>(sp =>
        new PythonSidecarClient(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
            sp.GetRequiredService<ILogger<PythonSidecarClient>>()));

    var persistRag = builder.Configuration.GetValue("Mozgoslav:Rag:Persist", defaultValue: true);
    if (persistRag)
    {
        builder.Services.AddSingleton<IVectorIndex>(_ => new SqliteVectorIndex(connectionString));
    }
    else
    {
        builder.Services.AddSingleton<IVectorIndex, InMemoryVectorIndex>();
    }

    builder.Services.Configure<HybridRetrieverOptions>(
        builder.Configuration.GetSection(HybridRetrieverOptions.SectionName));
    builder.Services.Configure<RerankerOptions>(
        builder.Configuration.GetSection(RerankerOptions.SectionName));

    builder.Services.AddSingleton<IRetriever>(sp =>
        new HybridRetriever(
            sp.GetRequiredService<IEmbeddingService>(),
            sp.GetRequiredService<IVectorIndex>(),
            sp.GetRequiredService<IDbContextFactory<MozgoslavDbContext>>(),
            connectionString,
            sp.GetRequiredService<IOptions<HybridRetrieverOptions>>(),
            sp.GetRequiredService<ILogger<HybridRetriever>>()));

    builder.Services.AddSingleton<IReranker>(sp =>
        new BgeRerankerProvider(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(SidecarClientName),
            sp.GetRequiredService<IOptions<RerankerOptions>>(),
            sp.GetRequiredService<ILogger<BgeRerankerProvider>>()));

    builder.Services.AddSingleton<IRagService>(sp =>
        new RagService(
            sp.GetRequiredService<IEmbeddingService>(),
            sp.GetRequiredService<IVectorIndex>(),
            sp.GetRequiredService<IRetriever>(),
            sp.GetRequiredService<IReranker>(),
            sp.GetRequiredService<ILlmService>(),
            sp.GetRequiredService<ILogger<RagService>>()));

    builder.Services.Configure<UnifiedSearchOptions>(
        builder.Configuration.GetSection(UnifiedSearchOptions.SectionName));
    builder.Services.AddSingleton<CorpusQueryTool>();
    builder.Services.AddSingleton<WebSearchTool>();
    builder.Services.AddSingleton<WebFetchTool>();
    builder.Services.AddSingleton<ObsidianReadTool>();

    var agentsProvider = builder.Configuration["Mozgoslav:Agents:Provider"];
    if (string.Equals(agentsProvider, "NoOp", StringComparison.OrdinalIgnoreCase))
    {
        builder.Services.AddSingleton<IAgentRunner, NoOpAgentRunner>();
    }
    else
    {
        builder.Services.AddSingleton<IAgentRunner>(sp =>
            new MafAgentRunner(
                sp.GetRequiredService<ILlmProviderFactory>(),
                sp.GetRequiredService<ILlmCapabilitiesCache>(),
                [
                    sp.GetRequiredService<CorpusQueryTool>(),
                    sp.GetRequiredService<WebSearchTool>(),
                    sp.GetRequiredService<WebFetchTool>(),
                    sp.GetRequiredService<ObsidianReadTool>(),
                ],
                sp.GetRequiredService<ILogger<MafAgentRunner>>()));
    }
    builder.Services.AddScoped<IUnifiedSearch, MafUnifiedSearch>();
    builder.Services.AddScoped<AskFromVoiceUseCase>();
    builder.Services.AddScoped<AggregateSummaryUseCase>();

    builder.Services.AddScoped<IPromptTemplateRepository, PromptTemplateRepository>();
    builder.Services.AddSingleton<IPromptBuilder, MozgoslavPromptBuilder>();
    builder.Services.AddSingleton<PromptDispatcher>();

    builder.Services.AddSingleton<IRemindersSkill, RemindersSkill>();
    builder.Services.AddScoped<IActionExtractorSkill, MafActionExtractorSkill>();
    builder.Services.AddHostedService<ActionExtractorDomainEventConsumer>();

    builder.Services.AddScoped<IRoutineRunRepository, RoutineRunRepository>();
    builder.Services.AddScoped<IRoutineRegistry, RoutineRegistry>();

    builder.Services.AddMcpServer()
        .WithHttpTransport()
        .WithToolsFromAssembly(typeof(CorpusMcpTools).Assembly);
    builder.Services.AddScoped<CorpusMcpTools>();
    builder.Services.AddScoped<RecordingsMcpTools>();
    builder.Services.AddScoped<NotesMcpTools>();
    builder.Services.AddScoped<DictationMcpTools>();
    builder.Services.AddScoped<ObsidianMcpTools>();
    builder.Services.AddScoped<WebMcpTools>();
    builder.Services.AddScoped<PromptsMcpTools>();

    builder.Services.Configure<SummaryOptions>(
        builder.Configuration.GetSection(SummaryOptions.SectionName));

    var webProvider = builder.Configuration["Mozgoslav:Web:Provider"];
    var searxngEndpoint = builder.Configuration["Mozgoslav:Web:SearXng:Endpoint"] ?? "http://localhost:8888";
    if (string.Equals(webProvider, "NoOp", StringComparison.OrdinalIgnoreCase))
    {
        builder.Services.AddSingleton<IWebSearch, NoOpWebSearch>();
    }
    else
    {
        const string SearXNGClientName = SearXNGProvider.HttpClientName;
        builder.Services.AddHttpClient(SearXNGClientName, client =>
        {
            client.BaseAddress = new Uri(searxngEndpoint);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(30);
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(10);
            options.Retry.MaxRetryAttempts = 2;
            options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;
            options.Retry.Delay = TimeSpan.FromSeconds(1);
            options.Retry.UseJitter = true;
            options.CircuitBreaker.FailureRatio = 0.5;
            options.CircuitBreaker.MinimumThroughput = 3;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(15);
        });
        builder.Services.AddSingleton<IWebSearch>(sp =>
            new SearXNGProvider(
                sp.GetRequiredService<IHttpClientFactory>().CreateClient(SearXNGClientName),
                sp.GetRequiredService<ILogger<SearXNGProvider>>()));
    }

    var cacheTtlHours = builder.Configuration.GetValue("Mozgoslav:Web:Extract:CacheTtlHours", 24);
    builder.Services.AddSingleton<IWebContentExtractor>(sp =>
        new TrafilaturaProvider(
            sp.GetRequiredService<IHttpClientFactory>().CreateClient(TrafilaturaProvider.HttpClientName),
            sp.GetRequiredService<IMemoryCache>(),
            TimeSpan.FromHours(cacheTtlHours),
            sp.GetRequiredService<ILogger<TrafilaturaProvider>>()));

    var searxngBundledSettings = Path.Combine(
        AppContext.BaseDirectory, "searxng-settings.yml");
    builder.Services.AddSingleton(sp =>
        new SearxngConfigService(
            searxngBundledSettings,
            sp.GetRequiredService<IAppSettings>(),
            sp.GetRequiredService<ILogger<SearxngConfigService>>()));

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
        .AddRuntimeInstrumentation()
        .AddPrometheusExporter());

    builder.Services.AddHostedService<DatabaseInitializer>();
    var summaryOptions = builder.Configuration
        .GetSection(SummaryOptions.SectionName)
        .Get<SummaryOptions>() ?? new SummaryOptions();

    builder.Services.AddQuartz(q =>
    {
        q.AddJob<ProcessRecordingQuartzJob>(jobConfig => jobConfig
            .StoreDurably()
            .RequestRecovery()
            .WithIdentity("process-recording-template", ProcessRecordingQuartzJob.JobGroup));

        if (summaryOptions.Weekly.Enabled)
        {
            q.AddJob<WeeklyAggregatedSummaryJob>(jobConfig => jobConfig
                .StoreDurably()
                .WithIdentity("weekly-summary", WeeklyAggregatedSummaryJob.JobGroup));
            q.AddTrigger(t => t
                .ForJob("weekly-summary", WeeklyAggregatedSummaryJob.JobGroup)
                .WithIdentity("weekly-summary-trigger", WeeklyAggregatedSummaryJob.JobGroup)
                .WithCronSchedule(summaryOptions.Weekly.Cron));
        }

        if (summaryOptions.Monthly.Enabled)
        {
            q.AddJob<MonthlyAggregatedSummaryJob>(jobConfig => jobConfig
                .StoreDurably()
                .WithIdentity("monthly-summary", MonthlyAggregatedSummaryJob.JobGroup));
            q.AddTrigger(t => t
                .ForJob("monthly-summary", MonthlyAggregatedSummaryJob.JobGroup)
                .WithIdentity("monthly-summary-trigger", MonthlyAggregatedSummaryJob.JobGroup)
                .WithCronSchedule(summaryOptions.Monthly.Cron));
        }
    });
    builder.Services.AddQuartzHostedService(options =>
    {
        options.WaitForJobsToComplete = true;
        options.AwaitApplicationStarted = true;
    });
    builder.Services.AddHostedService<ProcessingJobRehydrator>();
    builder.Services.AddHostedService<SyncthingVersioningVerifier>();
    builder.Services.AddHostedService<SyncthingLifecycleService>();
    builder.Services.AddHostedService<JobProgressBridge>();
    builder.Services.AddHostedService<Mozgoslav.Api.GraphQL.Dictation.AudioDeviceChangedBridge>();
    builder.Services.AddHostedService<Mozgoslav.Api.GraphQL.Dictation.HotkeyEventsBridge>();
    builder.Services.AddHostedService<Mozgoslav.Api.GraphQL.Sync.SyncEventsBridge>();

    builder.Services.AddMozgoslavGraphQL(builder.Environment);

    builder.Services.AddOpenApi();

    var app = builder.Build();

    if (args.Length > 0 && args[0] == "export-schema")
    {
        var outputPath = args.Length > 1 ? args[1] : "schema.graphql";
        var command = SchemaExportCommand.Create(app.Services);
        await command.RunAsync(outputPath);
        return;
    }

    app.UseSerilogRequestLogging();
    app.UseCors(DevelopmentCorsPolicy);

    app.MapOpenApi();
    app.MapPrometheusScrapingEndpoint();

    app.MapGraphQL("/graphql");

    app.MapInternalEndpoints();

    var mcpSettings = app.Services.GetRequiredService<IAppSettings>();
    if (mcpSettings.McpServerEnabled)
    {
        app.MapMcpEndpoints();
    }
    else
    {
        app.Map("/mcp", () => Results.StatusCode(503));
    }

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
