using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Rag;

public sealed record RerankedChunk(
    RetrievedChunk Chunk,
    double RerankScore);

public interface IReranker
{
    Task<IReadOnlyList<RerankedChunk>> RerankAsync(
        string query,
        IReadOnlyList<RetrievedChunk> chunks,
        int topK,
        CancellationToken ct);
}
