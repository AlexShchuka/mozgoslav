using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Spins up the real <c>Mozgoslav.Api</c> composition root backed by a temp SQLite
/// file. Each factory instance gets its own DB so tests are fully isolated.
/// <para>
/// Isolation is achieved by replacing the <see cref="DbContextOptions{TContext}"/>
/// registration via <c>ConfigureTestServices</c> AFTER
/// <c>Program.cs</c> has registered its own. The alternative of setting
/// <c>Mozgoslav:DatabasePath</c> via <c>AddInMemoryCollection</c> fails silently
/// because <c>Program.cs</c> reads <c>builder.Configuration</c> at configure-time,
/// before <c>ConfigureAppConfiguration</c> callbacks are applied to the web host —
/// see <c>docs/database-initializer-rca.md</c>.
/// </para>
/// </summary>
internal sealed class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory()
    {
        DatabasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-api-{Guid.NewGuid():N}.db");
    }

    public string DatabasePath { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        // UseSetting writes into the hosting config layer which is applied
        // before Program.cs reads builder.Configuration (ConfigureAppConfiguration
        // runs at Build() time, which is too late for eager reads).
        builder.UseSetting("Mozgoslav:DatabasePath", DatabasePath);
        // G2 added a sensible default sidecar URL in appsettings.json so the
        // production build picks up sentence-transformer embeddings. The
        // integration test sandbox has no sidecar — explicitly disable it so
        // the BoW fallback path is used and the circuit-breaker never trips.
        builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", string.Empty);
        // Kept as a belt-and-braces signal for any code that DOES read config late
        // (e.g. services that resolve IConfiguration after build). The DbContext
        // itself is overridden in ConfigureTestServices below.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Mozgoslav:DatabasePath"] = DatabasePath,
            });
        });
        builder.ConfigureTestServices(services =>
        {
            ReplaceDbContextRegistration(services, DatabasePath);
        });
    }

    private static void ReplaceDbContextRegistration(IServiceCollection services, string databasePath)
    {
        var connectionString = $"Data Source={databasePath}";

        // EF Core registers ~a dozen internal services via AddDbContextFactory /
        // AddDbContext. We cannot enumerate them all reliably here, so strip
        // everything scoped to the Microsoft.EntityFrameworkCore namespace and
        // then re-add our own registrations cleanly.
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
        if (!disposing)
        {
            return;
        }
        foreach (var path in new[] { DatabasePath, DatabasePath + "-wal", DatabasePath + "-shm" })
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch (IOException)
            {
                // best effort
            }
            catch (UnauthorizedAccessException)
            {
                // best effort
            }
        }
    }
}
