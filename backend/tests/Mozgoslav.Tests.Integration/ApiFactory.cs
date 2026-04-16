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
    private readonly string _databasePath;

    public ApiFactory()
    {
        _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-api-{Guid.NewGuid():N}.db");
    }

    public string DatabasePath => _databasePath;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Environment.SetEnvironmentVariable("Mozgoslav__DatabasePath", _databasePath);
        builder.UseEnvironment("IntegrationTest");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Mozgoslav:DatabasePath"] = _databasePath,
            });
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        try
        {
            if (File.Exists(_databasePath))
            {
                File.Delete(_databasePath);
            }
        }
        catch
        {
            // best effort
        }
    }
}
