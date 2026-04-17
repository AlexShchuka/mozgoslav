using System.Globalization;
using System.Net;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Rag;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.Rag;

/// <summary>
/// ADR-005 — contract tests for the Python-sidecar-backed embedding
/// service, including the graceful-fallback behaviour when the sidecar
/// is down or returns garbage.
///
/// Test list:
///  - EmbedAsync_HappyPath_ReturnsSidecarVector_AndAdvertisesDimensions
///  - EmbedAsync_WhenSidecarDown_FallsBackToInnerEmbedding
///  - EmbedAsync_WhenSidecarReturns500_FallsBackToInnerEmbedding
///  - EmbedAsync_EmptyVectors_FallsBackToInnerEmbedding
///  - EmbedAsync_DimensionDrift_AfterFirstCall_IsIgnored
/// </summary>
[TestClass]
public sealed class PythonSidecarEmbeddingServiceTests : IDisposable
{
    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private BagOfWordsEmbeddingService _fallback = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
        _fallback = new BagOfWordsEmbeddingService(dimensions: 64);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }
        _disposed = true;
        _http?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public async Task EmbedAsync_HappyPath_ReturnsSidecarVector_AndAdvertisesDimensions()
    {
        var sidecarVector = new[] { 0.1f, 0.2f, 0.3f, 0.4f };
        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(BuildResponse(sidecarVector, 4)));

        var sut = new PythonSidecarEmbeddingService(_http, _fallback, NullLogger<PythonSidecarEmbeddingService>.Instance);
        var vector = await sut.EmbedAsync("hello", CancellationToken.None);

        vector.Should().BeEquivalentTo(sidecarVector);
        sut.Dimensions.Should().Be(4);
    }

    [TestMethod]
    public async Task EmbedAsync_WhenSidecarDown_FallsBackToInnerEmbedding()
    {
        // No WireMock stub for /api/embed => 404 Not Found response (HttpRequestException path).
        // Even a 404 is not a connection failure; stop WireMock to simulate a true network outage.
        _server.Stop();

        var sut = new PythonSidecarEmbeddingService(_http, _fallback, NullLogger<PythonSidecarEmbeddingService>.Instance);
        var vector = await sut.EmbedAsync("обсидиан синхронизация", CancellationToken.None);
        var expected = await _fallback.EmbedAsync("обсидиан синхронизация", CancellationToken.None);

        vector.Should().BeEquivalentTo(expected);
    }

    [TestMethod]
    public async Task EmbedAsync_WhenSidecarReturns500_FallsBackToInnerEmbedding()
    {
        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.InternalServerError));

        var sut = new PythonSidecarEmbeddingService(_http, _fallback, NullLogger<PythonSidecarEmbeddingService>.Instance);
        var vector = await sut.EmbedAsync("hello", CancellationToken.None);
        var expected = await _fallback.EmbedAsync("hello", CancellationToken.None);

        vector.Should().BeEquivalentTo(expected);
    }

    [TestMethod]
    public async Task EmbedAsync_EmptyVectors_FallsBackToInnerEmbedding()
    {
        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(BuildResponse(Array.Empty<float>(), 0)));

        var sut = new PythonSidecarEmbeddingService(_http, _fallback, NullLogger<PythonSidecarEmbeddingService>.Instance);
        var vector = await sut.EmbedAsync("hello", CancellationToken.None);
        var expected = await _fallback.EmbedAsync("hello", CancellationToken.None);

        vector.Should().BeEquivalentTo(expected);
    }

    [TestMethod]
    public async Task EmbedAsync_DimensionDrift_AfterFirstCall_IsIgnored()
    {
        var first = new[] { 0.1f, 0.2f, 0.3f, 0.4f };
        var drifted = new[] { 0.5f, 0.5f, 0.5f, 0.5f, 0.5f };

        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .InScenario("drift")
            .WillSetStateTo("step2")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(BuildResponse(first, 4)));

        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .InScenario("drift")
            .WhenStateIs("step2")
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(BuildResponse(drifted, 5)));

        var sut = new PythonSidecarEmbeddingService(_http, _fallback, NullLogger<PythonSidecarEmbeddingService>.Instance);

        var v1 = await sut.EmbedAsync("first", CancellationToken.None);
        sut.Dimensions.Should().Be(4);

        var v2 = await sut.EmbedAsync("second", CancellationToken.None);
        // We still return what the sidecar gave us (caller decides), but
        // Dimensions remains the first-call dimension to keep the index stable.
        v2.Should().BeEquivalentTo(drifted);
        sut.Dimensions.Should().Be(4);
        v1.Should().BeEquivalentTo(first);
    }

    // ADR-007-shared §2.4 — sidecar single-text response shape is
    // { embedding: number[], dim: int }.
    private static string BuildResponse(IReadOnlyList<float> embedding, int dim)
    {
        var embeddingJson = string.Join(",", embedding.Select(f => f.ToString(CultureInfo.InvariantCulture)));
        return $"{{\"embedding\":[{embeddingJson}],\"dim\":{dim}}}";
    }
}
