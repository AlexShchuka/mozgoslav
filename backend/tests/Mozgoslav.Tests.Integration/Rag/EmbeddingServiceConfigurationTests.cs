using System;
using System.IO;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Integration.Rag;

[TestClass]
public sealed class EmbeddingServiceConfigurationTests
{
    [TestMethod]
    public async Task WhenSidecarBaseUrlConfigured_ResolvesPythonSidecarEmbedding()
    {
        await using var factory = new ConfigurableFactory(sidecarBaseUrl: "http://127.0.0.1:5060");

        using var scope = factory.Services.CreateScope();
        var embed = scope.ServiceProvider.GetRequiredService<IEmbeddingService>();

        embed.Should().BeOfType<PythonSidecarEmbeddingService>(
            "G2 — the sidecar is primary whenever Mozgoslav:PythonSidecar:BaseUrl is configured");
    }

    [TestMethod]
    public async Task WhenSidecarBaseUrlEmpty_ResolvesBagOfWordsEmbedding()
    {
        await using var factory = new ConfigurableFactory(sidecarBaseUrl: string.Empty);

        using var scope = factory.Services.CreateScope();
        var embed = scope.ServiceProvider.GetRequiredService<IEmbeddingService>();

        embed.Should().BeOfType<BagOfWordsEmbeddingService>(
            "explicit empty string disables the sidecar — zero-dependency BoW fallback applies");
    }

    private sealed class ConfigurableFactory : WebApplicationFactory<Program>
    {
        private readonly string? _sidecarBaseUrl;
        private readonly string _databasePath;

        public ConfigurableFactory(string? sidecarBaseUrl)
        {
            _sidecarBaseUrl = sidecarBaseUrl;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-g2-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.UseSetting("Mozgoslav:DatabasePath", _databasePath);
            builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", _sidecarBaseUrl ?? string.Empty);
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
