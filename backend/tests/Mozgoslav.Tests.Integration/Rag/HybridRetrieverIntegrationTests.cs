using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Integration.Rag;

[TestClass]
public sealed class HybridRetrieverIntegrationTests
{
    private static async Task<SqliteVectorIndex> BuildAndSeedIndexAsync(
        string connectionString,
        CancellationToken ct)
    {
        var index = new SqliteVectorIndex(connectionString);
        await index.UpsertAsync(
            new NoteChunk("chunk-obsidian", Guid.NewGuid(), "Настройка Obsidian vault через Syncthing на мобильном телефоне", [0.9f, 0.1f]),
            ct);
        await index.UpsertAsync(
            new NoteChunk("chunk-ci", Guid.NewGuid(), "Починить пайплайн непрерывной интеграции CI", [0.1f, 0.9f]),
            ct);
        await index.UpsertAsync(
            new NoteChunk("chunk-rag", Guid.NewGuid(), "Векторная база данных RAG chunking embedding", [0.5f, 0.5f]),
            ct);
        return index;
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridDisabled_ReturnsDenseResults()
    {
        await using var db = new TestDatabase();
        await using var index = await BuildAndSeedIndexAsync(db.ConnectionString, CancellationToken.None);

        var embedding = new DeterministicEmbedding([0.9f, 0.1f]);
        var sut = BuildHybridRetriever(embedding, index, db, hybridEnabled: false);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("Obsidian vault", TopK: 2),
            CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].ChunkId.Should().Be("chunk-obsidian");
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridEnabled_FtsBackedByRealFts5_ReturnsResults()
    {
        await using var db = new TestDatabase();

        await using var index = new SqliteVectorIndex(db.ConnectionString);
        await index.UpsertAsync(
            new NoteChunk("chunk-a", Guid.NewGuid(), "QR code pairing for mobile sync Obsidian", [1f, 0f]),
            CancellationToken.None);
        await index.UpsertAsync(
            new NoteChunk("chunk-b", Guid.NewGuid(), "Build pipeline fix CI integration", [0f, 1f]),
            CancellationToken.None);

        var embedding = new DeterministicEmbedding([1f, 0f]);
        var sut = BuildHybridRetriever(embedding, index, db, hybridEnabled: true);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("QR pairing mobile", TopK: 2),
            CancellationToken.None);

        result.Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task RetrieveAsync_DateFilter_ExcludesOldChunks()
    {
        await using var db = new TestDatabase();
        await using var index = await BuildAndSeedIndexAsync(db.ConnectionString, CancellationToken.None);

        var embedding = new DeterministicEmbedding([0.9f, 0.1f]);
        var sut = BuildHybridRetriever(embedding, index, db, hybridEnabled: false);

        var futureFilter = new MetadataFilter(
            FromUtc: DateTimeOffset.UtcNow.AddDays(1),
            ToUtc: null,
            ProfileIds: null,
            SpeakerIds: null);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("Obsidian", TopK: 5, Filter: futureFilter),
            CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RetrieveAsync_EmptyIndex_ReturnsEmpty()
    {
        await using var db = new TestDatabase();
        await using var index = new SqliteVectorIndex(db.ConnectionString);

        var embedding = new DeterministicEmbedding([1f, 0f]);
        var sut = BuildHybridRetriever(embedding, index, db, hybridEnabled: false);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("anything", TopK: 5),
            CancellationToken.None);

        result.Should().BeEmpty();
    }

    private static HybridRetriever BuildHybridRetriever(
        IEmbeddingService embedding,
        IVectorIndex index,
        TestDatabase db,
        bool hybridEnabled)
    {
        var options = Options.Create(new HybridRetrieverOptions
        {
            Enabled = hybridEnabled,
            RrfK = 60,
        });
        return new HybridRetriever(
            embedding,
            index,
            db.CreateFactory(),
            db.ConnectionString,
            options,
            NullLogger<HybridRetriever>.Instance);
    }

    private sealed class DeterministicEmbedding : IEmbeddingService
    {
        private readonly float[] _vector;

        public DeterministicEmbedding(float[] vector)
        {
            _vector = vector;
            Dimensions = vector.Length;
        }

        public int Dimensions { get; }

        public Task<float[]> EmbedAsync(string text, CancellationToken ct)
            => Task.FromResult(_vector);
    }
}
