using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory()
    {
        DatabasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-api-{Guid.NewGuid():N}.db");
    }

    public string DatabasePath { get; }

    public Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>? ModelsHttpResponder { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("IntegrationTest");
        builder.UseSetting("Mozgoslav:DatabasePath", DatabasePath);
        builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", string.Empty);
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
            if (ModelsHttpResponder is not null)
            {
                var responder = ModelsHttpResponder;
                services.AddHttpClient("models")
                    .ConfigurePrimaryHttpMessageHandler(() => new ScriptedHandler(responder));
            }
        });
    }

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _responder;

        public ScriptedHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => _responder(request, cancellationToken);
    }

    private static void ReplaceDbContextRegistration(IServiceCollection services, string databasePath)
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
            }
            catch (UnauthorizedAccessException)
            {
            }
        }
    }
}
