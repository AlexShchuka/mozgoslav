using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Spins up the real <c>Mozgoslav.Api</c> composition root backed by a temp SQLite
/// file. Each factory instance gets its own DB so tests are fully isolated.
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
        Environment.SetEnvironmentVariable("Mozgoslav__DatabasePath", DatabasePath);
        builder.UseEnvironment("IntegrationTest");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Mozgoslav:DatabasePath"] = DatabasePath
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing)
        {
            return;
        }
        try
        {
            if (File.Exists(DatabasePath))
            {
                File.Delete(DatabasePath);
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
