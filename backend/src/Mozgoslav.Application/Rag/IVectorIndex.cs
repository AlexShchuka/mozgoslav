using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Rag;

public interface IVectorIndex
{
    Task UpsertAsync(NoteChunk chunk, CancellationToken ct);

    Task RemoveByNoteAsync(Guid noteId, CancellationToken ct);

    Task<IReadOnlyList<NoteChunkHit>> SearchAsync(float[] queryEmbedding, int topK, CancellationToken ct);

    int Count { get; }
}
