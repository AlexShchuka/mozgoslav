using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Rag;

/// <summary>
/// ADR-005 D2 — port for the vector store. The MVP ships an in-memory
/// brute-force implementation (good enough for a few thousand notes on a
/// laptop). Future work can swap in <c>sqlite-vss</c> / <c>sqlite-vec</c>
/// without touching callers.
/// </summary>
public interface IVectorIndex
{
    /// <summary>Inserts or replaces a chunk keyed by <see cref="NoteChunk.Id"/>.</summary>
    Task UpsertAsync(NoteChunk chunk, CancellationToken ct);

    /// <summary>Removes every chunk belonging to a note. No-op if the note isn't indexed.</summary>
    Task RemoveByNoteAsync(Guid noteId, CancellationToken ct);

    /// <summary>Cosine-similarity search; returns up to <paramref name="topK"/> hits, best-first.</summary>
    Task<IReadOnlyList<NoteChunkHit>> SearchAsync(float[] queryEmbedding, int topK, CancellationToken ct);

    /// <summary>Diagnostic: total chunks currently indexed.</summary>
    int Count { get; }
}
