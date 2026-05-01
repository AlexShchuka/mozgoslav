using System;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Obsidian;
using Mozgoslav.Infrastructure.Obsidian;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Obsidian;

[TestClass]
public sealed class GitHubPluginInstallerTests
{
    private sealed class FakeHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly byte[] _content;

        public FakeHandler(HttpStatusCode statusCode, byte[] content)
        {
            _statusCode = statusCode;
            _content = content;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var response = new HttpResponseMessage(_statusCode)
            {
                Content = new ByteArrayContent(_content)
            };
            return Task.FromResult(response);
        }
    }

    private sealed class HttpSetup : IDisposable
    {
        private readonly FakeHandler _handler;
        public HttpClient Client { get; }

        public HttpSetup(HttpStatusCode statusCode, byte[] content)
        {
            _handler = new FakeHandler(statusCode, content);
            Client = new HttpClient(_handler);
        }

        public void Dispose()
        {
            Client.Dispose();
            _handler.Dispose();
        }
    }

    private sealed class Fixture : IDisposable
    {
        private readonly IHttpClientFactory _httpClientFactory = Substitute.For<IHttpClientFactory>();
        private HttpSetup? _httpSetup;

        public Fixture()
        {
            VaultPath = Path.Combine(Path.GetTempPath(), $"vault-test-{Guid.NewGuid():N}");
            Directory.CreateDirectory(VaultPath);
        }

        public string VaultPath { get; }

        public GitHubPluginInstaller BuildSut() =>
            new(_httpClientFactory, NullLogger<GitHubPluginInstaller>.Instance);

        public void SetupDownloadResponse(byte[] content)
        {
            ReplaceSetup(new HttpSetup(HttpStatusCode.OK, content));
        }

        public void SetupDownloadFailure()
        {
            ReplaceSetup(new HttpSetup(HttpStatusCode.NotFound, []));
        }

        [SuppressMessage("IDisposableAnalyzers.Correctness", "IDISP004:Don't ignore created IDisposable",
            Justification = "CreateClient returns a pre-existing client owned by HttpSetup, not a new disposable")]
        private void ReplaceSetup(HttpSetup newSetup)
        {
            var old = _httpSetup;
            _httpSetup = newSetup;
            old?.Dispose();
            _httpClientFactory.CreateClient(GitHubPluginInstaller.HttpClientName).Returns(_httpSetup.Client);
        }

        public void Dispose()
        {
            _httpSetup?.Dispose();
            if (Directory.Exists(VaultPath))
            {
                Directory.Delete(VaultPath, recursive: true);
            }
        }
    }

    private static string Sha256Of(byte[] data)
    {
        var hash = SHA256.HashData(data);
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            sb.Append(b.ToString("X2", System.Globalization.CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }

    private static PluginInstallSpec MakeSpec(string sha256) =>
        new("test-plugin", "testowner", "testrepo", "v1.0.0",
            [new PluginAssetSpec("main.js", sha256, "main.js")]);

    [TestMethod]
    public async Task InstallAsync_NullSpec_ThrowsArgumentNullException()
    {
        using var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.InstallAsync(null!, fixture.VaultPath, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task InstallAsync_BlankVaultPath_ThrowsArgumentException()
    {
        using var fixture = new Fixture();
        var spec = MakeSpec("abc");
        var sut = fixture.BuildSut();

        var act = async () => await sut.InstallAsync(spec, "", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task InstallAsync_DownloadFails_ReturnsDownloadFailed()
    {
        using var fixture = new Fixture();
        fixture.SetupDownloadFailure();
        var spec = MakeSpec("abc123");
        var sut = fixture.BuildSut();

        var result = await sut.InstallAsync(spec, fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.DownloadFailed);
    }

    [TestMethod]
    public async Task InstallAsync_HashMismatch_ReturnsHashMismatch()
    {
        using var fixture = new Fixture();
        var content = Encoding.UTF8.GetBytes("real file content");
        fixture.SetupDownloadResponse(content);
        var spec = MakeSpec("DEADBEEF0000000000000000000000000000000000000000000000000000FFFF");
        var sut = fixture.BuildSut();

        var result = await sut.InstallAsync(spec, fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.HashMismatch);
    }

    [TestMethod]
    public async Task InstallAsync_ValidDownload_ReturnsInstalled()
    {
        using var fixture = new Fixture();
        var content = Encoding.UTF8.GetBytes("plugin content");
        var sha256 = Sha256Of(content);
        fixture.SetupDownloadResponse(content);
        var spec = MakeSpec(sha256);
        var sut = fixture.BuildSut();

        var result = await sut.InstallAsync(spec, fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.Installed);
        result.PluginId.Should().Be("test-plugin");
        result.WrittenFiles.Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task InstallAsync_AlreadyInstalledWithMatchingHash_ReturnsAlreadyInstalled()
    {
        using var fixture = new Fixture();
        var content = Encoding.UTF8.GetBytes("plugin content");
        var sha256 = Sha256Of(content);

        var pluginDir = Path.Combine(fixture.VaultPath, ".obsidian", "plugins", "test-plugin");
        Directory.CreateDirectory(pluginDir);
        await File.WriteAllBytesAsync(Path.Combine(pluginDir, "main.js"), content);

        var dotObsidian = Path.Combine(fixture.VaultPath, ".obsidian");
        Directory.CreateDirectory(dotObsidian);
        await File.WriteAllTextAsync(Path.Combine(dotObsidian, "community-plugins.json"), "[\"test-plugin\"]");

        var spec = MakeSpec(sha256);
        var sut = fixture.BuildSut();

        var result = await sut.InstallAsync(spec, fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.AlreadyInstalled);
    }

    [TestMethod]
    public async Task EnsureRemovedAsync_NonExistentPlugin_ReturnsNotInstalled()
    {
        using var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.EnsureRemovedAsync("ghost-plugin", fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.NotInstalled);
    }

    [TestMethod]
    public async Task EnsureRemovedAsync_ExistingPlugin_ReturnsRemoved()
    {
        using var fixture = new Fixture();
        var pluginDir = Path.Combine(fixture.VaultPath, ".obsidian", "plugins", "my-plugin");
        Directory.CreateDirectory(pluginDir);
        await File.WriteAllTextAsync(Path.Combine(pluginDir, "main.js"), "content");

        var dotObsidian = Path.Combine(fixture.VaultPath, ".obsidian");
        await File.WriteAllTextAsync(Path.Combine(dotObsidian, "community-plugins.json"), "[\"my-plugin\"]");

        var sut = fixture.BuildSut();

        var result = await sut.EnsureRemovedAsync("my-plugin", fixture.VaultPath, CancellationToken.None);

        result.Status.Should().Be(PluginInstallStatus.Removed);
        Directory.Exists(pluginDir).Should().BeFalse();
    }
}
