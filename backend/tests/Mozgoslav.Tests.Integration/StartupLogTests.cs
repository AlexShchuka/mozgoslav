using System.Collections.Concurrent;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Seed;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007 BC-052 / bug 8 — verifies startup log lines are emitted exactly
/// once and not duplicated by captive-dependency scope blow-up.
/// </summary>
[TestClass]
public sealed class StartupLogTests
{
    [TestMethod]
    public async Task SchemaEnsured_EmittedExactlyOnce()
    {
        var captured = new ConcurrentQueue<string>();
        await using var factory = new CapturingApiFactory(captured);

        using var _ = factory.CreateClient();

        captured.Count(line => line.Contains("EF Core migrations applied", StringComparison.Ordinal))
            .Should().Be(1);
    }

    [TestMethod]
    public async Task SeededBuiltInProfiles_EmittedExactlyOnce()
    {
        var captured = new ConcurrentQueue<string>();
        await using var factory = new CapturingApiFactory(captured);

        using var _ = factory.CreateClient();

        captured.Count(line => line.Contains("Seeded 3 built-in profiles", StringComparison.Ordinal))
            .Should().Be(1);
    }

    private sealed class CapturingApiFactory : WebApplicationFactory<Program>, IAsyncDisposable
    {
        private readonly ConcurrentQueue<string> _captured;
        private readonly string _databasePath;

        public CapturingApiFactory(ConcurrentQueue<string> captured)
        {
            _captured = captured;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-startup-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Mozgoslav:DatabasePath"] = _databasePath,
                });
            });
            builder.ConfigureTestServices(services =>
            {
                ReplaceDbContext(services, _databasePath);
                services.AddSingleton<ILogger<DatabaseInitializer>>(_ => new CapturingLogger<DatabaseInitializer>(_captured));
            });
        }

        private static void ReplaceDbContext(IServiceCollection services, string databasePath)
        {
            var connectionString = $"Data Source={databasePath}";
            for (var i = services.Count - 1; i >= 0; i--)
            {
                var ns = services[i].ServiceType.Namespace;
                if (ns is not null && ns.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal))
                {
                    services.RemoveAt(i);
                }
            }
            for (var i = services.Count - 1; i >= 0; i--)
            {
                if (services[i].ServiceType == typeof(MozgoslavDbContext))
                {
                    services.RemoveAt(i);
                }
            }
            services.AddDbContextFactory<MozgoslavDbContext>(options => options.UseSqlite(connectionString));
            services.AddDbContext<MozgoslavDbContext>(
                options => options.UseSqlite(connectionString),
                contextLifetime: ServiceLifetime.Scoped,
                optionsLifetime: ServiceLifetime.Singleton);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing) return;
            foreach (var path in new[] { _databasePath, _databasePath + "-wal", _databasePath + "-shm" })
            {
                try { if (File.Exists(path)) File.Delete(path); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }
}
