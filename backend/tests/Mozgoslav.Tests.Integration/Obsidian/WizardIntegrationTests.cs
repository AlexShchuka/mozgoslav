using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Infrastructure.Persistence;

using NSubstitute;

namespace Mozgoslav.Tests.Integration.Obsidian;

[TestClass]
public sealed class WizardIntegrationTests : IDisposable
{
    public TestContext TestContext { get; set; } = null!;

    private WizardApiFactory _factory = null!;
    private string _vaultPath = null!;

    public void Dispose() => _factory?.Dispose();

    [TestInitialize]
    public void Init()
    {
        _vaultPath = Path.Combine(Path.GetTempPath(), $"mozgoslav-vault-{Guid.NewGuid():N}");
        Directory.CreateDirectory(Path.Combine(_vaultPath, ".obsidian"));
        _factory = new WizardApiFactory();
    }

    [TestCleanup]
    public void Cleanup()
    {
        _factory.Dispose();
        try
        {
            if (Directory.Exists(_vaultPath))
            {
                Directory.Delete(_vaultPath, recursive: true);
            }
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    [TestMethod]
    public async Task RunWizardStep_Step1_ReturnsCurrentStep()
    {
        await SetVaultPathAsync(_vaultPath);
        using var client = _factory.CreateClient();
        var json = await PostMutationAsync(client, """
            mutation { obsidianRunWizardStep(step: 1) {
                currentStep nextStep
                diagnostics { isHealthy }
                errors { code message }
            } }
            """);

        var payload = json["data"]!["obsidianRunWizardStep"]!;
        payload["currentStep"]!.GetValue<int>().Should().Be(1);
        payload["errors"]!.AsArray().Should().BeEmpty();
        payload["diagnostics"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task ReapplyBootstrap_OnFreshVault_OverwritesFiles()
    {
        await SetVaultPathAsync(_vaultPath);
        using var client = _factory.CreateClient();
        var json = await PostMutationAsync(client, """
            mutation { obsidianReapplyBootstrap {
                overwritten skipped backedUpTo
                errors { code message }
            } }
            """);

        var payload = json["data"]!["obsidianReapplyBootstrap"]!;
        payload["errors"]!.AsArray().Should().BeEmpty();
        payload["overwritten"]!.AsArray().Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task ReinstallPlugins_OnConfiguredVault_ReturnsAllPinned()
    {
        await SetVaultPathAsync(_vaultPath);
        using var client = _factory.CreateClient();
        var json = await PostMutationAsync(client, """
            mutation { obsidianReinstallPlugins {
                reinstalled
                errors { code message }
            } }
            """);

        var payload = json["data"]!["obsidianReinstallPlugins"]!;
        payload["errors"]!.AsArray().Should().BeEmpty();
        payload["reinstalled"]!.AsArray().Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task RunDiagnostics_OnConfiguredVault_ReturnsReport()
    {
        await SetVaultPathAsync(_vaultPath);
        using var client = _factory.CreateClient();
        var json = await PostMutationAsync(client, """
            mutation { obsidianRunDiagnostics {
                report { isHealthy generatedAt }
                errors { code message }
            } }
            """);

        var payload = json["data"]!["obsidianRunDiagnostics"]!;
        payload["report"].Should().NotBeNull();
        payload["errors"]!.AsArray().Should().BeEmpty();
    }

    private async Task SetVaultPathAsync(string vaultPath)
    {
        var settings = _factory.Services.GetRequiredService<IAppSettings>();
        var snapshot = settings.Snapshot;
        await settings.SaveAsync(snapshot with { VaultPath = vaultPath }, CancellationToken.None);
    }

    private static async Task<JsonNode> PostMutationAsync(HttpClient client, string mutation)
    {
        var body = new { query = mutation };
        using var response = await client.PostAsJsonAsync("/graphql", body);
        response.EnsureSuccessStatusCode();
        var raw = await response.Content.ReadAsStringAsync();
        var node = JsonNode.Parse(raw);
        node.Should().NotBeNull();
        return node;
    }

    private sealed class WizardApiFactory : WebApplicationFactory<Program>
    {
        public string DatabasePath { get; }

        public WizardApiFactory()
        {
            DatabasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-wizard-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.UseSetting("Mozgoslav:DatabasePath", DatabasePath);
            builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", string.Empty);
            builder.ConfigureTestServices(services =>
            {
                ReplaceDbContext(services, DatabasePath);
                ReplacePluginInstaller(services);
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

        private static void ReplacePluginInstaller(IServiceCollection services)
        {
            for (var i = services.Count - 1; i >= 0; i--)
            {
                if (services[i].ServiceType == typeof(IPluginInstaller))
                {
                    services.RemoveAt(i);
                }
            }
            services.AddScoped(_ =>
            {
                var stub = Substitute.For<IPluginInstaller>();
                stub.InstallAsync(Arg.Any<PluginInstallSpec>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
                    .Returns(call =>
                    {
                        var spec = call.Arg<PluginInstallSpec>();
                        return Task.FromResult(new PluginInstallResult(
                            spec.Id, PluginInstallStatus.Installed, null, Array.Empty<string>()));
                    });
                stub.EnsureRemovedAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
                    .Returns(call =>
                    {
                        var id = call.ArgAt<string>(0);
                        return Task.FromResult(new PluginInstallResult(
                            id, PluginInstallStatus.Removed, null, Array.Empty<string>()));
                    });
                return stub;
            });
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
}
