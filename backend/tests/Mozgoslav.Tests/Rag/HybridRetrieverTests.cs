using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;
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

    private static IDbContextFactory<MozgoslavDbContext> BuildDbFactory(
        SqliteConnection keepAlive,
        IReadOnlyList<NoteChunkHit> hits)
    {
        var options = new DbContextOptionsBuilder<MozgoslavDbContext>()
            .UseSqlite(keepAlive)
            .Options;
        using var db = new MozgoslavDbContext(options);
        db.Database.EnsureCreated();
        foreach (var hit in hits)
        {
            db.RagChunks.Add(new RagChunk
            {
                Id = hit.Chunk.Id,
                NoteId = hit.Chunk.NoteId,
                Text = hit.Chunk.Text,
                Embedding = Array.Empty<byte>(),
                Dimensions = hit.Chunk.Embedding.Length,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }
        db.SaveChanges();
        return new FixedConnectionFactory(keepAlive);
    }

    private static HybridRetriever BuildSut(
        IEmbeddingService embedding,
        IVectorIndex index,
        SqliteConnection keepAlive,
        IReadOnlyList<NoteChunkHit>? hitsForDb = null,
        bool hybridEnabled = false)
    {
        var dbFactory = BuildDbFactory(keepAlive, hitsForDb ?? []);
        var options = Options.Create(new HybridRetrieverOptions
        {
            Enabled = hybridEnabled,
            RrfK = 60,
        });
        return new HybridRetriever(
            embedding,
            index,
            dbFactory,
            keepAlive.ConnectionString,
            options,
            NullLogger<HybridRetriever>.Instance);
    }

    private sealed class FixedConnectionFactory : IDbContextFactory<MozgoslavDbContext>
    {
        private readonly SqliteConnection _connection;

        public FixedConnectionFactory(SqliteConnection connection)
        {
            _connection = connection;
        }

        public MozgoslavDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<MozgoslavDbContext>()
                .UseSqlite(_connection)
                .Options;
            return new MozgoslavDbContext(options);
        }

        public Task<MozgoslavDbContext> CreateDbContextAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(CreateDbContext());
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridDisabled_ReturnsDenseTopK()
    {
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync();

        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text one", vec), 0.9),
            new NoteChunkHit(new NoteChunk("c2", noteId, "text two", vec), 0.7),
            new NoteChunkHit(new NoteChunk("c3", noteId, "text three", vec), 0.5),
        };

        var sut = BuildSut(BuildEmbedding(vec), BuildIndex(hits), conn, hits, hybridEnabled: false);
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
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync();

        var vec = new float[] { 1f, 0f };
        var sut = BuildSut(BuildEmbedding(vec), BuildIndex(Array.Empty<NoteChunkHit>()), conn, hybridEnabled: false);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("question", TopK: 5),
            CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RetrieveAsync_MetadataFilter_PassedThroughQuery()
    {
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync();

        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text", vec), 0.9),
        };

        var index = BuildIndex(hits);
        var sut = BuildSut(BuildEmbedding(vec), index, conn, hits, hybridEnabled: false);

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
        await using var conn = new SqliteConnection("Data Source=:memory:");
        await conn.OpenAsync();

        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();
        var hits = new[]
        {
            new NoteChunkHit(new NoteChunk("c1", noteId, "text one", vec), 0.9),
        };

        var sut = BuildSut(
            BuildEmbedding(vec),
            BuildIndex(hits),
            conn,
            hits,
            hybridEnabled: true);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("query", TopK: 1),
            CancellationToken.None);

        result.Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task RetrieveAsync_HybridEnabled_FtsRescuesMissingChunk()
    {
        var dbName = $"test_hybrid_{Guid.NewGuid():N}";
        var connString = $"Data Source={dbName};Mode=Memory;Cache=Shared";
        await using var keepAlive = new SqliteConnection(connString);
        await keepAlive.OpenAsync();

        var vec = new float[] { 1f, 0f };
        var noteId = Guid.NewGuid();

        var chunkA = new NoteChunkHit(new NoteChunk("ca", noteId, "alpha beta", vec), 0.9);
        var chunkB = new NoteChunkHit(new NoteChunk("cb", noteId, "bravo zulu", vec), 0.7);
        var chunkC = new NoteChunkHit(new NoteChunk("cc", noteId, "rare proper noun Zygotplatz", vec), 0.0);

        var dbFactory = BuildDbFactory(keepAlive, [chunkA, chunkB, chunkC]);

        await using var ftsCmd = keepAlive.CreateCommand();
        ftsCmd.CommandText = """
            CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(chunk_id UNINDEXED, content);
            INSERT INTO rag_chunks_fts(chunk_id, content) VALUES ('ca', 'alpha beta');
            INSERT INTO rag_chunks_fts(chunk_id, content) VALUES ('cb', 'bravo zulu');
            INSERT INTO rag_chunks_fts(chunk_id, content) VALUES ('cc', 'rare proper noun Zygotplatz');
            """;
        await ftsCmd.ExecuteNonQueryAsync();

        var denseIndex = BuildIndex([chunkA, chunkB]);

        var options = Options.Create(new HybridRetrieverOptions { Enabled = true, RrfK = 60 });
        var sut = new HybridRetriever(
            BuildEmbedding(vec),
            denseIndex,
            dbFactory,
            connString,
            options,
            NullLogger<HybridRetriever>.Instance);

        var result = await sut.RetrieveAsync(
            new RetrievalQuery("Zygotplatz", TopK: 3),
            CancellationToken.None);

        result.Should().HaveCount(3);
        result.Select(r => r.ChunkId).Should().Contain("cc");
    }
}
