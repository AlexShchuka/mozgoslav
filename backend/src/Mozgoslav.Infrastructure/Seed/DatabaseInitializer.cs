using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Seed;

public sealed class DatabaseInitializer : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IVectorIndex _vectorIndex;
    private readonly ILogger<DatabaseInitializer> _logger;

    public DatabaseInitializer(
        IServiceScopeFactory scopeFactory,
        IVectorIndex vectorIndex,
        ILogger<DatabaseInitializer> logger)
    {
        _scopeFactory = scopeFactory;
        _vectorIndex = vectorIndex;
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
        var withDefaults = RuntimeDefaults.Apply(loaded);
        if (!loaded.Equals(withDefaults))
        {
            await settings.SaveAsync(withDefaults, cancellationToken);
            _logger.LogInformation("Populated default settings on first run");
        }

        _logger.LogInformation("Settings ready: language={Language}, vault={Vault}",
            settings.Language, string.IsNullOrEmpty(settings.VaultPath) ? "<not set>" : settings.VaultPath);

        try
        {
            _logger.LogInformation("RAG index loaded: {Chunks} chunk(s)", _vectorIndex.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RAG index status check failed on startup — vector store may be unavailable");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
