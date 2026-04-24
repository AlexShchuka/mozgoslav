using System;
using System.IO;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Graph;

public sealed class GraphApiFactory : WebApplicationFactory<Program>
{
    public GraphApiFactory()
    {
        DatabasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-graph-{Guid.NewGuid():N}.db");
    }

    public string DatabasePath { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        builder.UseSetting("Mozgoslav:DatabasePath", DatabasePath);
        builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", string.Empty);
        builder.ConfigureTestServices(services =>
        {
            ReplaceDbContext(services, DatabasePath);
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
        foreach (var path in new[] { DatabasePath, DatabasePath + "-wal", DatabasePath + "-shm" })
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
    }
}
