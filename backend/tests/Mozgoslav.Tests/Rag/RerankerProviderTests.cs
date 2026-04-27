using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Rag;

[TestClass]
public sealed class RerankerProviderTests
{
    private static readonly Guid NoteId = Guid.NewGuid();

    private static RetrievedChunk MakeChunk(string id, string text = "sample") =>
        new(
            ChunkId: id,
            NoteId: NoteId.ToString("D"),
            Text: text,
            Embedding: [1f, 0f],
            CreatedAt: DateTimeOffset.UtcNow,
            ProfileId: null,
            Speaker: null,
            Score: 0.5);

    [TestMethod]
    public async Task RerankAsync_EmptyChunks_ReturnsEmpty()
    {
        using var handler = new StubHandler(HttpStatusCode.OK, "[]");
        using var client = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5060") };
        var sut = BuildSut(client);

        var result = await sut.RerankAsync(
            "query",
            Array.Empty<RetrievedChunk>(),
            3,
            CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RerankAsync_Enabled_ReturnsServerRankedOrder()
    {
        var responseBody = JsonSerializer.Serialize(new[]
        {
            new { id = "c2", score = 0.95 },
            new { id = "c1", score = 0.6 },
        });
        using var handler = new StubHandler(HttpStatusCode.OK, responseBody);
        using var client = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5060") };
        var sut = BuildSut(client);
        var chunks = new[]
        {
            MakeChunk("c1", "first text"),
            MakeChunk("c2", "second text"),
        };

        var result = await sut.RerankAsync("query", chunks, 2, CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].Chunk.ChunkId.Should().Be("c2");
        result[0].RerankScore.Should().BeApproximately(0.95, 0.001);
        result[1].Chunk.ChunkId.Should().Be("c1");
    }

    [TestMethod]
    public async Task RerankAsync_Disabled_ReturnsByRetrievalScore()
    {
        using var handler = new StubHandler(HttpStatusCode.OK, "[]");
        using var client = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5060") };
        var sut = BuildSut(client, enabled: false);
        var chunks = new[]
        {
            MakeChunk("c1") with { Score = 0.9 },
            MakeChunk("c2") with { Score = 0.5 },
        };

        var result = await sut.RerankAsync("query", chunks, 2, CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].Chunk.ChunkId.Should().Be("c1");
    }

    [TestMethod]
    public async Task RerankAsync_SidecarDown_FallsBackGracefully()
    {
        using var handler = new ErrorHandler();
        using var client = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5060") };
        var sut = BuildSut(client);
        var chunks = new[]
        {
            MakeChunk("c1"),
            MakeChunk("c2"),
        };

        var result = await sut.RerankAsync("query", chunks, 2, CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [TestMethod]
    public async Task RerankAsync_TopK_LimitsResults()
    {
        var responseBody = JsonSerializer.Serialize(new[]
        {
            new { id = "c1", score = 0.9 },
            new { id = "c2", score = 0.7 },
            new { id = "c3", score = 0.5 },
        });
        using var handler = new StubHandler(HttpStatusCode.OK, responseBody);
        using var client = new HttpClient(handler) { BaseAddress = new Uri("http://localhost:5060") };
        var sut = BuildSut(client);
        var chunks = new[]
        {
            MakeChunk("c1"),
            MakeChunk("c2"),
            MakeChunk("c3"),
        };

        var result = await sut.RerankAsync("query", chunks, 2, CancellationToken.None);

        result.Should().HaveCount(2);
    }

    private static BgeRerankerProvider BuildSut(
        HttpClient client,
        bool enabled = true,
        int topK = 5)
    {
        var options = Options.Create(new RerankerOptions
        {
            ModelId = "BAAI/bge-reranker-v2-m3",
            Enabled = enabled,
            TopK = topK,
        });
        return new BgeRerankerProvider(client, options, NullLogger<BgeRerankerProvider>.Instance);
    }

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _status;
        private readonly string _body;

        public StubHandler(HttpStatusCode status, string body)
        {
            _status = status;
            _body = body;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_body, System.Text.Encoding.UTF8, "application/json"),
            });
        }
    }

    private sealed class ErrorHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            throw new HttpRequestException("connection refused");
    }
}
