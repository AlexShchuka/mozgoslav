using FluentAssertions;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Rag;

/// <summary>
/// ADR-005 D2 — brute-force cosine index. Focus on correctness of the
/// state machine, not raw throughput (MVP targets a few thousand chunks).
///
/// Test list:
///  - Upsert_ThenCount_Reflects
///  - Search_ReturnsTopKOrderedByCosine
///  - Search_MismatchedDimension_Skipped
///  - RemoveByNote_DropsAllChunksOfThatNote
///  - Search_OnEmptyIndex_ReturnsEmpty
///  - Upsert_SameId_ReplacesPreviousChunk
/// </summary>
[TestClass]
public sealed class InMemoryVectorIndexTests
{
    [TestMethod]
    public async Task Upsert_ThenCount_Reflects()
    {
        var idx = new InMemoryVectorIndex();
        await idx.UpsertAsync(MakeChunk("a", [1f, 0f, 0f]), CancellationToken.None);
        await idx.UpsertAsync(MakeChunk("b", [0f, 1f, 0f]), CancellationToken.None);

        idx.Count.Should().Be(2);
    }

    [TestMethod]
    public async Task Search_ReturnsTopKOrderedByCosine()
    {
        var idx = new InMemoryVectorIndex();
        var queryAxis = new[] { 1f, 0f, 0f };
        var close = MakeChunk("close", [0.9f, 0.1f, 0f]);
        var mid = MakeChunk("mid", [0.5f, 0.5f, 0f]);
        var far = MakeChunk("far", [0f, 0f, 1f]);
        await idx.UpsertAsync(close, CancellationToken.None);
        await idx.UpsertAsync(mid, CancellationToken.None);
        await idx.UpsertAsync(far, CancellationToken.None);

        var hits = await idx.SearchAsync(queryAxis, topK: 2, CancellationToken.None);

        hits.Should().HaveCount(2);
        hits[0].Chunk.Id.Should().Be("close");
        hits[1].Chunk.Id.Should().Be("mid");
        hits[0].Score.Should().BeGreaterThan(hits[1].Score);
    }

    [TestMethod]
    public async Task Search_MismatchedDimension_Skipped()
    {
        var idx = new InMemoryVectorIndex();
        await idx.UpsertAsync(MakeChunk("ok", [1f, 0f]), CancellationToken.None);
        await idx.UpsertAsync(MakeChunk("bad", [1f, 0f, 0f]), CancellationToken.None);

        var hits = await idx.SearchAsync([1f, 0f], topK: 5, CancellationToken.None);

        hits.Should().ContainSingle().Which.Chunk.Id.Should().Be("ok");
    }

    [TestMethod]
    public async Task RemoveByNote_DropsAllChunksOfThatNote()
    {
        var idx = new InMemoryVectorIndex();
        var noteA = Guid.NewGuid();
        var noteB = Guid.NewGuid();
        await idx.UpsertAsync(new NoteChunk("a1", noteA, "...", [1f, 0f]), CancellationToken.None);
        await idx.UpsertAsync(new NoteChunk("a2", noteA, "...", [0f, 1f]), CancellationToken.None);
        await idx.UpsertAsync(new NoteChunk("b1", noteB, "...", [0f, 1f]), CancellationToken.None);

        await idx.RemoveByNoteAsync(noteA, CancellationToken.None);

        idx.Count.Should().Be(1);
        var hits = await idx.SearchAsync([0f, 1f], topK: 10, CancellationToken.None);
        hits.Should().ContainSingle().Which.Chunk.NoteId.Should().Be(noteB);
    }

    [TestMethod]
    public async Task Search_OnEmptyIndex_ReturnsEmpty()
    {
        var idx = new InMemoryVectorIndex();
        var hits = await idx.SearchAsync([1f, 0f], 5, CancellationToken.None);
        hits.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Upsert_SameId_ReplacesPreviousChunk()
    {
        var idx = new InMemoryVectorIndex();
        var noteId = Guid.NewGuid();
        await idx.UpsertAsync(new NoteChunk("same", noteId, "old", [1f, 0f]), CancellationToken.None);
        await idx.UpsertAsync(new NoteChunk("same", noteId, "new", [0f, 1f]), CancellationToken.None);

        idx.Count.Should().Be(1);
        var hits = await idx.SearchAsync([0f, 1f], 1, CancellationToken.None);
        hits.Single().Chunk.Text.Should().Be("new");
    }

    private static NoteChunk MakeChunk(string id, float[] embedding) =>
        new(id, Guid.NewGuid(), $"chunk-{id}", embedding);
}
