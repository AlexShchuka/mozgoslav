using System.Globalization;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

/// <summary>
/// ADR-005 D3 MVP — deterministic, ML-free embedding: tokenise, lowercase,
/// hash each token into a fixed-dimension bag, TF-weight by count, L2-
/// normalise. Zero model downloads, zero external services, produces
/// "embeddings" that are good enough for keyword-overlap retrieval over
/// a personal note corpus.
/// <para>
/// This is explicitly the fallback: production builds should point
/// <see cref="IEmbeddingService"/> at the Python sidecar's
/// <c>/embed</c> endpoint (sentence-transformers) or a bundled ONNX copy
/// of <c>all-MiniLM-L6-v2</c>. The bag-of-words baseline means RAG works
/// out of the box before the user picks a heavier model.
/// </para>
/// </summary>
public sealed class BagOfWordsEmbeddingService : IEmbeddingService
{
    private const int DefaultDimensions = 256;
    private static readonly char[] TokenDelimiters = [
        ' ', '\t', '\r', '\n', '.', ',', ';', ':', '!', '?', '"', '\'',
        '(', ')', '[', ']', '{', '}', '/', '\\', '-', '—', '–',
    ];

    public BagOfWordsEmbeddingService(int? dimensions = null)
    {
        Dimensions = dimensions ?? DefaultDimensions;
        if (Dimensions <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(dimensions), "Must be positive");
        }
    }

    public int Dimensions { get; }

    public Task<float[]> EmbedAsync(string text, CancellationToken ct)
    {
        var vector = new float[Dimensions];
        if (string.IsNullOrWhiteSpace(text))
        {
            return Task.FromResult(vector);
        }

        var tokens = text.ToLower(CultureInfo.InvariantCulture)
            .Split(TokenDelimiters, StringSplitOptions.RemoveEmptyEntries);

        foreach (var token in tokens)
        {
            if (token.Length < 2)
            {
                continue;
            }
            var bucket = (int)((uint)StableHash(token) % (uint)Dimensions);
            vector[bucket] += 1f;
        }

        Normalize(vector);
        return Task.FromResult(vector);
    }

    private static void Normalize(float[] vector)
    {
        double sumSq = 0;
        foreach (var v in vector)
        {
            sumSq += v * v;
        }
        if (sumSq == 0)
        {
            return;
        }
        var norm = (float)Math.Sqrt(sumSq);
        for (var i = 0; i < vector.Length; i++)
        {
            vector[i] /= norm;
        }
    }

    /// <summary>
    /// FNV-1a 32-bit hash — stable across runs / platforms, unlike
    /// <see cref="string.GetHashCode()"/> which is randomised per process.
    /// </summary>
    private static int StableHash(string s)
    {
        const uint FnvOffsetBasis = 2166136261u;
        const uint FnvPrime = 16777619u;
        var hash = FnvOffsetBasis;
        foreach (var c in s)
        {
            hash ^= c;
            hash *= FnvPrime;
        }
        return unchecked((int)hash);
    }
}
