using FluentAssertions;
using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Integration.Rag;

/// <summary>
/// ADR-005 — persistence tests for the SQLite-backed vector index.
///
/// Test list:
///  - Upsert_And_Count_Roundtrip
///  - Upsert_SameId_Replaces
///  - RemoveByNote_DeletesAllChunksForThatNote
///  - Search_Returns_TopK_Ordered_By_Cosine
///  - Search_SkipsDimensionMismatch
///  - Search_EmptyIndex_ReturnsEmpty
///  - Persistence_SurvivesInstanceReopen
/// </summary>
[TestClass]
public sealed class SqliteVectorIndexTests
{
    private string _dbPath = null!;
    private string _connectionString = null!;

    [TestInitialize]
    public void Setup()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"mozgoslav-rag-{Guid.NewGuid():N}.db");
        _connectionString = $"Data Source={_dbPath}";
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (File.Exists(_dbPath))
        {
            try { File.Delete(_dbPath); } catch { /* best effort */ }
        }
    }

    [TestMethod]
    public async Task Upsert_And_Count_Roundtrip()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        await sut.UpsertAsync(Chunk("a", 0.1f, 0.2f), CancellationToken.None);
        await sut.UpsertAsync(Chunk("b", 0.3f, 0.4f), CancellationToken.None);

        sut.Count.Should().Be(2);
    }

    [TestMethod]
    public async Task Upsert_SameId_Replaces()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        await sut.UpsertAsync(Chunk("a", 0.1f, 0.2f, text: "old"), CancellationToken.None);
        await sut.UpsertAsync(Chunk("a", 0.5f, 0.6f, text: "new"), CancellationToken.None);

        sut.Count.Should().Be(1);
        var hits = await sut.SearchAsync([0.5f, 0.6f], 1, CancellationToken.None);
        hits.Should().HaveCount(1);
        hits[0].Chunk.Text.Should().Be("new");
    }

    [TestMethod]
    public async Task RemoveByNote_DeletesAllChunksForThatNote()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        var noteA = Guid.NewGuid();
        var noteB = Guid.NewGuid();
        await sut.UpsertAsync(Chunk("a1", 0.1f, 0.2f, noteId: noteA), CancellationToken.None);
        await sut.UpsertAsync(Chunk("a2", 0.3f, 0.4f, noteId: noteA), CancellationToken.None);
        await sut.UpsertAsync(Chunk("b1", 0.5f, 0.6f, noteId: noteB), CancellationToken.None);

        await sut.RemoveByNoteAsync(noteA, CancellationToken.None);

        sut.Count.Should().Be(1);
        var hits = await sut.SearchAsync([0.5f, 0.6f], 5, CancellationToken.None);
        hits.Should().ContainSingle().Which.Chunk.Id.Should().Be("b1");
    }

    [TestMethod]
    public async Task Search_Returns_TopK_Ordered_By_Cosine()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        await sut.UpsertAsync(Chunk("exact", 1f, 0f), CancellationToken.None);
        await sut.UpsertAsync(Chunk("close", 0.9f, 0.1f), CancellationToken.None);
        await sut.UpsertAsync(Chunk("far", 0f, 1f), CancellationToken.None);

        var hits = await sut.SearchAsync([1f, 0f], topK: 2, CancellationToken.None);

        hits.Should().HaveCount(2);
        hits[0].Chunk.Id.Should().Be("exact");
        hits[1].Chunk.Id.Should().Be("close");
        hits[0].Score.Should().BeGreaterThan(hits[1].Score);
    }

    [TestMethod]
    public async Task Search_SkipsDimensionMismatch()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        await sut.UpsertAsync(Chunk("two-dim", 0.1f, 0.2f), CancellationToken.None);
        await sut.UpsertAsync(new NoteChunk("three-dim", Guid.NewGuid(), "t", [0.1f, 0.2f, 0.3f]), CancellationToken.None);

        var hits = await sut.SearchAsync([0.1f, 0.2f], 5, CancellationToken.None);

        hits.Should().ContainSingle().Which.Chunk.Id.Should().Be("two-dim");
    }

    [TestMethod]
    public async Task Search_EmptyIndex_ReturnsEmpty()
    {
        await using var sut = new SqliteVectorIndex(_connectionString);
        var hits = await sut.SearchAsync([0.1f, 0.2f], 5, CancellationToken.None);
        hits.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Persistence_SurvivesInstanceReopen()
    {
        await using (var first = new SqliteVectorIndex(_connectionString))
        {
            await first.UpsertAsync(Chunk("a", 0.1f, 0.2f), CancellationToken.None);
        }

        await using var second = new SqliteVectorIndex(_connectionString);
        second.Count.Should().Be(1);
        var hits = await second.SearchAsync([0.1f, 0.2f], 1, CancellationToken.None);
        hits.Should().ContainSingle().Which.Chunk.Id.Should().Be("a");
    }

    private static NoteChunk Chunk(
        string id,
        float a,
        float b,
        string text = "sample",
        Guid? noteId = null) =>
        new(id, noteId ?? Guid.NewGuid(), text, [a, b]);
}
