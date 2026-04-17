namespace Mozgoslav.Application.Rag;

/// <summary>
/// ADR-005 D3 — turns a text string into a dense vector. Production
/// implementations will wrap <c>sentence-transformers</c> via the Python
/// sidecar or an ONNX port of <c>all-MiniLM-L6-v2</c>; for the desktop MVP
/// we ship a deterministic bag-of-words fallback so RAG works out of the
/// box with zero external model downloads.
/// <para>
/// All vectors returned by a single implementation must have the same
/// <see cref="Dimensions"/> and should be L2-normalised so cosine
/// similarity collapses to a dot product.
/// </para>
/// </summary>
public interface IEmbeddingService
{
    int Dimensions { get; }

    Task<float[]> EmbedAsync(string text, CancellationToken ct);
}
