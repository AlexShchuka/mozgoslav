using System.Collections.Concurrent;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

/// <summary>
/// ADR-005 D2 MVP — brute-force cosine-similarity search over an in-memory
/// dictionary. Good for a few thousand chunks on a laptop (the typical
/// personal note corpus); anything larger should swap in the
/// <c>sqlite-vss</c>-backed index (follow-up ADR).
/// <para>
/// Thread-safe via <see cref="ConcurrentDictionary{TKey,TValue}"/> for
/// upserts; the read-side enumerates a snapshot so concurrent upserts
/// during a search never throw.
/// </para>
/// </summary>
public sealed class InMemoryVectorIndex : IVectorIndex
{
    private readonly ConcurrentDictionary<string, NoteChunk> _chunks = new(StringComparer.Ordinal);

    public int Count => _chunks.Count;

    public Task UpsertAsync(NoteChunk chunk, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunk);
        _chunks[chunk.Id] = chunk;
        return Task.CompletedTask;
    }

    public Task RemoveByNoteAsync(Guid noteId, CancellationToken ct)
    {
        foreach (var id in _chunks.Where(kv => kv.Value.NoteId == noteId).Select(kv => kv.Key).ToArray())
        {
            _chunks.TryRemove(id, out _);
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<NoteChunkHit>> SearchAsync(
        float[] queryEmbedding,
        int topK,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(queryEmbedding);
        if (topK <= 0)
        {
            return Task.FromResult<IReadOnlyList<NoteChunkHit>>([]);
        }

        var snapshot = _chunks.Values.ToArray();
        var scored = new List<NoteChunkHit>(snapshot.Length);
        foreach (var chunk in snapshot)
        {
            if (chunk.Embedding.Length != queryEmbedding.Length)
            {
                continue;
            }
            scored.Add(new NoteChunkHit(chunk, CosineSimilarity(queryEmbedding, chunk.Embedding)));
        }

        scored.Sort((a, b) => b.Score.CompareTo(a.Score));
        IReadOnlyList<NoteChunkHit> result = scored.Take(topK).ToArray();
        return Task.FromResult(result);
    }

    internal static double CosineSimilarity(float[] a, float[] b)
    {
        double dot = 0, na = 0, nb = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0)
        {
            return 0;
        }
        return dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }
}
