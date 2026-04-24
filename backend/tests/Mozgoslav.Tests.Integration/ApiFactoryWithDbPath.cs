using System;
using System.Collections.Generic;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

internal sealed class ApiFactoryWithDbPath : WebApplicationFactory<Program>
{
    public ApiFactoryWithDbPath(string databasePath)
    {
        DatabasePath = databasePath;
    }

    public string DatabasePath { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Mozgoslav:DatabasePath"] = DatabasePath,
            });
        });
        builder.ConfigureTestServices(services =>
        {
            var connectionString = $"Data Source={DatabasePath}";

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
        });
    }
}
