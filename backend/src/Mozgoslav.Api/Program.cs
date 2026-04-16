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

    builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(5050));

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
    builder.Services.AddDbContext<MozgoslavDbContext>((sp, options) => options.UseSqlite(connectionString),
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
    builder.Services.AddSingleton<ITranscriptionService, WhisperNetTranscriptionService>();
    builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
    builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
    builder.Services.AddSingleton<IAudioRecorder, NoopAudioRecorder>();
    builder.Services.AddScoped<MeetilyImporterService>();
    builder.Services.AddScoped<ObsidianSetupService>();
    builder.Services.AddSingleton<ModelDownloadService>();
    builder.Services.AddSingleton<BackupService>();
    builder.Services.AddSingleton<MozgoslavMetrics>();

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
    app.MapNoteEndpoints();
    app.MapProfileEndpoints();
    app.MapSettingsEndpoints();
    app.MapModelEndpoints();
    app.MapMeetilyEndpoints();
    app.MapObsidianEndpoints();
    app.MapSseEndpoints();
    app.MapLogsEndpoints();
    app.MapBackupEndpoints();

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

public partial class Program;
