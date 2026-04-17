using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Integration.Syncthing;

/// <summary>
/// ADR-007-shared §2.8 / Migration 0010 — persisted Syncthing coordinates
/// (api key + base url) survive a backend restart so the Electron host can
/// resume talking to the same Syncthing instance without re-spawning it.
/// </summary>
[TestClass]
public sealed class SyncthingSettingsPersistenceTests
{
    [TestMethod]
    public async Task Settings_SyncthingApiKey_Persists_AcrossRestart()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"mozgoslav-synct-{Guid.NewGuid():N}.db");

        try
        {
            // First boot: write api key + base url into settings.
            await using (var factory = new ApiFactoryWithDbPath(dbPath))
            {
                using var _ = factory.CreateClient();
                using var scope = factory.Services.CreateScope();
                var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
                await settings.LoadAsync(TestContext.CancellationToken);

                var dto = settings.Snapshot with
                {
                    SyncthingApiKey = "ABCDEF1234567890",
                    SyncthingBaseUrl = "http://127.0.0.1:55443",
                };
                await settings.SaveAsync(dto, TestContext.CancellationToken);
            }

            // Second boot: different factory instance, same DB file.
            await using (var factory = new ApiFactoryWithDbPath(dbPath))
            {
                using var _ = factory.CreateClient();
                using var scope = factory.Services.CreateScope();
                var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
                var reloaded = await settings.LoadAsync(TestContext.CancellationToken);

                reloaded.SyncthingApiKey.Should().Be("ABCDEF1234567890");
                reloaded.SyncthingBaseUrl.Should().Be("http://127.0.0.1:55443");
            }
        }
        finally
        {
            foreach (var path in new[] { dbPath, dbPath + "-wal", dbPath + "-shm" })
            {
                try
                {
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }

    public TestContext TestContext { get; set; } = null!;
}
