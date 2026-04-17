using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Mozgoslav.Api.BackgroundServices;
using Mozgoslav.Api.Endpoints;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;
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

    // In IntegrationTest the host uses TestServer; binding Kestrel would be
    // confusing (the port is never hit) and — more importantly — makes test
    // logs claim "Now listening on: http://localhost:5050" when nothing of
    // the sort is happening. Skip it.
    if (!builder.Environment.IsEnvironment("IntegrationTest"))
    {
        builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(5050));
    }

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
    var databasePath = builder.Configuration["Mozgoslav:DatabasePath"];
    if (string.IsNullOrWhiteSpace(databasePath))
    {
        databasePath = AppPaths.Database;
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
    builder.Services.AddSingleton<IVadPreprocessor, SileroVadPreprocessor>();
    builder.Services.AddSingleton<WhisperNetTranscriptionService>();
    builder.Services.AddSingleton<ITranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<IStreamingTranscriptionService>(sp => sp.GetRequiredService<WhisperNetTranscriptionService>());
    builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
    builder.Services.AddSingleton<ILlmProviderFactory, LlmProviderFactory>();
    builder.Services.AddSingleton<ILlmProvider, OpenAiCompatibleLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, AnthropicLlmProvider>();
    builder.Services.AddSingleton<ILlmProvider, OllamaLlmProvider>();
    builder.Services.AddHttpClient(AnthropicLlmProvider.HttpClientName);
    builder.Services.AddHttpClient(OllamaLlmProvider.HttpClientName);
    builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
    // B11 / ADR-006 D-15.a: real mic capture on macOS via ffmpeg's AVFoundation
    // input (no new bundled binary — ffmpeg is already a README prerequisite).
    // Non-macOS hosts fall back to the NoopAudioRecorder so builds stay portable.
    if (System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.OSX))
    {
        builder.Services.AddSingleton<IAudioRecorder, FfmpegAudioRecorder>();
    }
    else
    {
        builder.Services.AddSingleton<IAudioRecorder, NoopAudioRecorder>();
    }
    builder.Services.AddSingleton<IDictationSessionManager, DictationSessionManager>();
    builder.Services.AddScoped<MeetilyImporterService>();
    builder.Services.AddScoped<ObsidianSetupService>();
    builder.Services.AddSingleton<BackupService>();
    builder.Services.AddSingleton<MozgoslavMetrics>();
    builder.Services.AddSingleton<SyncthingConfigService>();

    // ADR-003 D3: Syncthing REST client. Base address is configurable — in
    // production it is rewired by the Electron lifecycle service once the
    // bundled syncthing binary reports its random localhost port + api-key;
    // meanwhile the default points at the documented :8384 so stand-alone
    // debugging against a user-installed syncthing also works.
    // B6 / ADR-006 D-11: LM Studio discovery only. The HttpClient here is a bare
    // transport; base address is resolved per-request from AppSettings.LlmEndpoint
    // (which the user owns and can repoint at Ollama / vLLM etc.).
    builder.Services.AddHttpClient<ILmStudioClient, LmStudioHttpClient>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(3);
    });

    builder.Services.AddHttpClient<ISyncthingClient, SyncthingHttpClient>(client =>
    {
        var baseAddress = builder.Configuration["Mozgoslav:SyncthingBaseUrl"]
            ?? "http://127.0.0.1:8384";
        client.BaseAddress = new Uri(baseAddress);
        var apiKey = builder.Configuration["Mozgoslav:SyncthingApiKey"];
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        }
    });

    builder.Services.AddOpenTelemetry().WithMetrics(m => m
        .AddMeter(MozgoslavMetrics.MeterName)
        .AddAspNetCoreInstrumentation()
        .AddRuntimeInstrumentation());

    builder.Services.AddHostedService<DatabaseInitializer>();
    builder.Services.AddHostedService<QueueBackgroundService>();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors(DevelopmentCorsPolicy);

    app.MapHealthEndpoints();
    app.MapRecordingEndpoints();
    app.MapJobEndpoints();
    app.MapQueueEndpoints();
    app.MapLmStudioEndpoints();
    app.MapNoteEndpoints();
    app.MapProfileEndpoints();
    app.MapSettingsEndpoints();
    app.MapModelEndpoints();
    app.MapMeetilyEndpoints();
    app.MapObsidianEndpoints();
    app.MapSseEndpoints();
    app.MapLogsEndpoints();
    app.MapBackupEndpoints();
    app.MapDictationEndpoints();
    app.MapSyncEndpoints();

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
