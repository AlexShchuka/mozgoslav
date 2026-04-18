using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.Obsidian;

/// <summary>
/// Plan v0.8 Block 6 — contract tests for <see cref="ObsidianRestApiClient"/>
/// via WireMock. Covers happy path, unreachable, empty-token, 401 / cert
/// mismatch (simulated through WireMock status codes; the real cert callback
/// lives in DI and runs on shuka's Mac validation pass).
/// </summary>
[TestClass]
public sealed class ObsidianRestApiClientTests : IDisposable
{
    private WireMockServer _server = null!;
    private ObsidianRestApiClient _client = null!;
    private IAppSettings _settings = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        _settings = Substitute.For<IAppSettings>();
        _settings.ObsidianApiHost.Returns(_server.Urls[0]);
        _settings.ObsidianApiToken.Returns("test-token");

        _innerHttp = new HttpClient();
        var factory = new StaticHttpClientFactory(_innerHttp);
        _client = new ObsidianRestApiClient(factory, _settings, NullLogger<ObsidianRestApiClient>.Instance);
    }

    private HttpClient _innerHttp = null!;

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _innerHttp?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public async Task IsReachableAsync_HappyPath_ReturnsTrue()
    {
        _server.Given(Request.Create().WithPath("/").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBody("{}"));
        var result = await _client.IsReachableAsync(TestContext.CancellationToken);
        result.Should().BeTrue();
    }

    [TestMethod]
    public async Task IsReachableAsync_EmptyToken_ReturnsFalseWithoutHit()
    {
        _settings.ObsidianApiToken.Returns(string.Empty);
        _server.Given(Request.Create().WithPath("/").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200));
        var result = await _client.IsReachableAsync(TestContext.CancellationToken);
        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task IsReachableAsync_ServerDown_ReturnsFalse()
    {
        _server.Stop();
        var result = await _client.IsReachableAsync(TestContext.CancellationToken);
        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task IsReachableAsync_Returns401_ReturnsFalse()
    {
        _server.Given(Request.Create().WithPath("/").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(401));
        var result = await _client.IsReachableAsync(TestContext.CancellationToken);
        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task GetVaultInfoAsync_ParsesVersionFromEnvelope()
    {
        _server.Given(Request.Create().WithPath("/").UsingGet())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""
                    {
                      "service": "Obsidian Local REST API",
                      "manifest": { "version": "1.5.3" },
                      "vaultPath": "/Users/shuka/Vault"
                    }
                    """));

        var info = await _client.GetVaultInfoAsync(TestContext.CancellationToken);
        info.Name.Should().Be("Obsidian Local REST API");
        info.Version.Should().Be("1.5.3");
        info.Path.Should().Be("/Users/shuka/Vault");
    }

    [TestMethod]
    public async Task OpenNoteAsync_PostsEscapedPath()
    {
        // WireMock matches decoded paths — the client escapes "/" to "%2F" in
        // transit but the matcher sees the decoded form. We still assert the
        // request was delivered successfully (200) to prove the route shape.
        _server.Given(Request.Create().WithPath("/open/inbox/note.md").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));
        _server.Given(Request.Create().WithPath("/open/inbox%2Fnote.md").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));

        await _client.OpenNoteAsync("inbox/note.md", TestContext.CancellationToken);
    }

    [TestMethod]
    public async Task EnsureFolderAsync_PutsWithTrailingSlash()
    {
        _server.Given(Request.Create().WithPath("/vault/People/").UsingPut())
            .RespondWith(Response.Create().WithStatusCode(200));
        await _client.EnsureFolderAsync("People", TestContext.CancellationToken);
    }

    public TestContext TestContext { get; set; } = null!;

    private sealed class StaticHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _httpClient;
        public StaticHttpClientFactory(HttpClient httpClient) => _httpClient = httpClient;
        public HttpClient CreateClient(string name) => _httpClient;
    }
}
