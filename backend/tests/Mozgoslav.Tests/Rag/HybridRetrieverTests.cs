using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

using NSubstitute;

namespace Mozgoslav.Tests.Rag;

[TestClass]
public sealed class HybridRetrieverTests
{
    private static IEmbeddingService BuildEmbedding(float[] vector)
    {
        var svc = Substitute.For<IEmbeddingService>();
        svc.EmbedAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(vector);
        return svc;
    }

    private static IVectorIndex BuildIndex(IReadOnlyList<NoteChunkHit> hits)
    {
        var idx = Substitute.For<IVectorIndex>();
        idx.SearchAsync(Arg.Any<float[]>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(hits);
        return idx;
    }

    private static HybridRetriever BuildSut(
        IEmbeddingService embedding,
        IVectorIndex index,
        string connectionString = "Data Source=:memory:",
        bool hybridEnabled = false)
    {
        var options = Options.Create(new HybridRetrieverOptions
        {
            Enabled = hybridEnabled,
            RrfK = 60,
        });
        return new HybridRetriever(
            embedding,
            index,
            connectionString,
            options,
            NullLogger<HybridRetriever>.Instance);
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridDisabled_ReturnsDenseTopK()
    {
        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text one", vec), 0.9),
            new NoteChunkHit(new NoteChunk("c2", noteId, "text two", vec), 0.7),
            new NoteChunkHit(new NoteChunk("c3", noteId, "text three", vec), 0.5),
        };

        var sut = BuildSut(BuildEmbedding(vec), BuildIndex(hits), hybridEnabled: false);
        var result = await sut.RetrieveAsync(
            new RetrievalQuery("query", TopK: 2),
            CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].ChunkId.Should().Be("c1");
        result[1].ChunkId.Should().Be("c2");
    }

    [TestMethod]
    public async Task RetrieveAsync_EmptyIndex_ReturnsEmpty()
    {
        var vec = new float[] { 1f, 0f };
        var sut = BuildSut(BuildEmbedding(vec), BuildIndex(Array.Empty<NoteChunkHit>()), hybridEnabled: false);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("question", TopK: 5),
            CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RetrieveAsync_MetadataFilter_PassedThroughQuery()
    {
        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text", vec), 0.9),
        };

        var index = BuildIndex(hits);
        var sut = BuildSut(BuildEmbedding(vec), index, hybridEnabled: false);

        var filter = new MetadataFilter(
            FromUtc: DateTimeOffset.UtcNow.AddDays(-7),
            ToUtc: DateTimeOffset.UtcNow,
            ProfileIds: null,
            SpeakerIds: null);

        await sut.RetrieveAsync(
            new RetrievalQuery("query", TopK: 5, Filter: filter),
            CancellationToken.None);

        await index.Received(1).SearchAsync(
            Arg.Any<float[]>(),
            Arg.Any<int>(),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridEnabled_FtsFailure_GracefulFallback()
    {
        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text one", vec), 0.9),
        };

        var sut = BuildSut(
            BuildEmbedding(vec),
            BuildIndex(hits),
            connectionString: "Data Source=:memory:",
            hybridEnabled: true);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("query", TopK: 1),
            CancellationToken.None);

        result.Should().NotBeEmpty();
    }
}
