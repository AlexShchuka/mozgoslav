using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Seed;

/// <summary>
/// Runs once at startup: ensures the SQLite schema exists (EF Core
/// <c>EnsureCreated</c>), seeds built-in profiles, and populates sensible default
/// settings for macOS so the app works out of the box.
/// </summary>
public sealed class DatabaseInitializer : IHostedService
{
    private readonly IDbContextFactory<MozgoslavDbContext> _contextFactory;
    private readonly IProfileRepository _profiles;
    private readonly IAppSettings _settings;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(
        IDbContextFactory<MozgoslavDbContext> contextFactory,
        IProfileRepository profiles,
        IAppSettings settings,
        ILogger<DatabaseInitializer> logger)
    {
        _contextFactory = contextFactory;
        _profiles = profiles;
        _settings = settings;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        AppPaths.EnsureExist();

        await using (var db = await _contextFactory.CreateDbContextAsync(cancellationToken))
        {
            await db.Database.EnsureCreatedAsync(cancellationToken);
        }
        _logger.LogInformation("SQLite schema ensured");

        foreach (var profile in BuiltInProfiles.All)
        {
            await _profiles.AddAsync(profile, cancellationToken);
        }
        _logger.LogInformation("Seeded {Count} built-in profiles", BuiltInProfiles.All.Count);

        var loaded = await _settings.LoadAsync(cancellationToken);
        var withDefaults = ApplyRuntimeDefaults(loaded);
        if (!loaded.Equals(withDefaults))
        {
            await _settings.SaveAsync(withDefaults, cancellationToken);
            _logger.LogInformation("Populated default settings on first run");
        }

        _logger.LogInformation("Settings ready: language={Language}, vault={Vault}",
            _settings.Language, string.IsNullOrEmpty(_settings.VaultPath) ? "<not set>" : _settings.VaultPath);
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
