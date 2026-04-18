using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Seed;

/// <summary>
/// Runs once at startup: applies pending EF Core migrations (ADR-011 step 1 —
/// replaces the legacy <c>EnsureCreated</c> + marker-file ledger with the
/// standard <c>DbContext.Database.MigrateAsync</c> pipeline), seeds built-in
/// profiles, and populates sensible default settings for macOS so the app
/// works out of the box. The implementation is singleton-safe — it resolves
/// the scoped <see cref="IProfileRepository"/> via <see cref="IServiceScopeFactory"/>
/// so there is no captive-dependency bug and the "Seeded 3 built-in profiles"
/// line is logged exactly once.
/// <para>
/// Intentionally stays on <see cref="IHostedService"/> rather than
/// <see cref="BackgroundService"/>: <c>StartAsync</c> blocks the host from
/// serving requests until the schema is ready. <c>BackgroundService.ExecuteAsync</c>
/// runs *after* the host reports "Started", which would race with an incoming
/// request hitting a half-migrated DB.
/// </para>
/// </summary>
public sealed class DatabaseInitializer : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(
        IServiceScopeFactory scopeFactory,
        ILogger<DatabaseInitializer> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        AppPaths.EnsureExist();

        await using var scope = _scopeFactory.CreateAsyncScope();
        var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<MozgoslavDbContext>>();
        var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();
        var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();

        await using (var db = await contextFactory.CreateDbContextAsync(cancellationToken))
        {
            await db.Database.MigrateAsync(cancellationToken);
        }
        _logger.LogInformation("EF Core migrations applied");

        foreach (var profile in BuiltInProfiles.All)
        {
            await profiles.AddAsync(profile, cancellationToken);
        }
        _logger.LogInformation("Seeded {Count} built-in profiles", BuiltInProfiles.All.Count);

        var loaded = await settings.LoadAsync(cancellationToken);
        var withDefaults = ApplyRuntimeDefaults(loaded);
        if (!loaded.Equals(withDefaults))
        {
            await settings.SaveAsync(withDefaults, cancellationToken);
            _logger.LogInformation("Populated default settings on first run");
        }

        _logger.LogInformation("Settings ready: language={Language}, vault={Vault}",
            settings.Language, string.IsNullOrEmpty(settings.VaultPath) ? "<not set>" : settings.VaultPath);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static AppSettingsDto ApplyRuntimeDefaults(AppSettingsDto current) => current with
    {
        WhisperModelPath = string.IsNullOrWhiteSpace(current.WhisperModelPath)
            ? AppPaths.DefaultWhisperModelPath
            : current.WhisperModelPath,
        VadModelPath = string.IsNullOrWhiteSpace(current.VadModelPath)
            ? AppPaths.DefaultVadModelPath
            : current.VadModelPath,
        VaultPath = string.IsNullOrWhiteSpace(current.VaultPath)
            ? string.Empty
            : current.VaultPath
    };
}
