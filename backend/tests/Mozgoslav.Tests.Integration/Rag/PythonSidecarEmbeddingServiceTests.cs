using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Rag;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.Rag;

[TestClass]
public sealed class PythonSidecarEmbeddingServiceTests : IDisposable
{
    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
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

        var sut = new PythonSidecarEmbeddingService(_http, NullLogger<PythonSidecarEmbeddingService>.Instance);
        var vector = await sut.EmbedAsync("hello", CancellationToken.None);

        vector.Should().BeEquivalentTo(sidecarVector);
        sut.Dimensions.Should().Be(4);
    }

    [TestMethod]
    public async Task EmbedAsync_WhenSidecarDown_ThrowsHttpRequestException()
    {
        _server.Stop();

        var sut = new PythonSidecarEmbeddingService(_http, NullLogger<PythonSidecarEmbeddingService>.Instance);

        var act = async () => await sut.EmbedAsync("обсидиан синхронизация", CancellationToken.None);
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [TestMethod]
    public async Task EmbedAsync_WhenSidecarReturns500_ThrowsHttpRequestException()
    {
        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(HttpStatusCode.InternalServerError));

        var sut = new PythonSidecarEmbeddingService(_http, NullLogger<PythonSidecarEmbeddingService>.Instance);

        var act = async () => await sut.EmbedAsync("hello", CancellationToken.None);
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [TestMethod]
    public async Task EmbedAsync_EmptyVectors_ThrowsInvalidOperationException()
    {
        _server.Given(Request.Create().WithPath("/api/embed").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(BuildResponse(Array.Empty<float>(), 0)));

        var sut = new PythonSidecarEmbeddingService(_http, NullLogger<PythonSidecarEmbeddingService>.Instance);

        var act = async () => await sut.EmbedAsync("hello", CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [TestMethod]
    public async Task EmbedAsync_DimensionDrift_UpdatesDimensions()
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

        var sut = new PythonSidecarEmbeddingService(_http, NullLogger<PythonSidecarEmbeddingService>.Instance);

        var v1 = await sut.EmbedAsync("first", CancellationToken.None);
        sut.Dimensions.Should().Be(4);

        var v2 = await sut.EmbedAsync("second", CancellationToken.None);
        v2.Should().BeEquivalentTo(drifted);
        sut.Dimensions.Should().Be(5);
        v1.Should().BeEquivalentTo(first);
    }

    private static string BuildResponse(IReadOnlyList<float> embedding, int dim)
    {
        var embeddingJson = string.Join(",", embedding.Select(f => f.ToString(CultureInfo.InvariantCulture)));
        return $"{{\"embedding\":[{embeddingJson}],\"dim\":{dim}}}";
    }
}
