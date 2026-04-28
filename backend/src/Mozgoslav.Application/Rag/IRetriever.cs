using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Rag;

public sealed record RetrievalQuery(
    string Query,
    int TopK,
    MetadataFilter? Filter = null);

public sealed record RetrievedChunk(
    string ChunkId,
    string NoteId,
    string Text,
    float[] Embedding,
    DateTimeOffset CreatedAt,
    string? ProfileId,
    string? Speaker,
    double Score);

public interface IRetriever
{
    Task<IReadOnlyList<RetrievedChunk>> RetrieveAsync(RetrievalQuery query, CancellationToken ct);
}
