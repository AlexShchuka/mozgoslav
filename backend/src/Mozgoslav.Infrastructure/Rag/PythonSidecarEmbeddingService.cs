using System.Net.Http.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

/// <summary>
/// ADR-005 D3 / ADR-007-shared §2.4 production path — swaps
/// <see cref="BagOfWordsEmbeddingService"/> for sentence-transformer vectors
/// served by the Python sidecar on <c>POST /api/embed</c>. When the sidecar
/// is unreachable (process not launched yet, user disabled it, port changed,
/// …) we transparently degrade to an inner fallback
/// <see cref="IEmbeddingService"/> so the RAG endpoint keeps working; the
/// fallback is the same bag-of-words service the MVP ships with, so
/// previously-indexed notes still match.
/// </summary>
/// <remarks>
/// <para>
/// The contract is the ADR-007-shared §2.4 single-text shape:
/// <c>POST /api/embed { text }</c> → <c>{ embedding: number[], dim: int }</c>.
/// The sidecar always returns an L2-normalised 384-float vector from
/// <c>paraphrase-multilingual-MiniLM-L12-v2</c> (or the deterministic SHA-256
/// BoW fallback when PyTorch is unavailable on the sidecar host).
/// </para>
/// <para>
/// The service caches the first successful probe of the sidecar's
/// <c>dim</c> so we never return mismatched-dimension vectors
/// mid-session; if the sidecar's advertised dimension drifts (model
/// swap), we log a warning and keep the first dimension until the process
/// restarts. Dimension drift during a run would corrupt the vector
/// index, so a restart is the safe boundary.
/// </para>
/// </remarks>
public sealed class PythonSidecarEmbeddingService : IEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly IEmbeddingService _fallback;
    private readonly ILogger<PythonSidecarEmbeddingService> _logger;

    public PythonSidecarEmbeddingService(
        HttpClient httpClient,
        IEmbeddingService fallback,
        ILogger<PythonSidecarEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _fallback = fallback;
        _logger = logger;
        Dimensions = fallback.Dimensions;
    }

    public int Dimensions { get; set; }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct)
    {
        try
        {
            var request = new EmbedRequest(text ?? string.Empty);
            using var response = await _httpClient.PostAsJsonAsync("/api/embed", request, ct);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<EmbedResponse>(ct)
                ?? throw new InvalidOperationException("Sidecar returned null body");

            if (body.Embedding is null || body.Embedding.Length == 0)
            {
                throw new InvalidOperationException("Sidecar returned empty vector");
            }

            if (Dimensions != body.Dim)
            {
                if (Dimensions != _fallback.Dimensions)
                {
                    _logger.LogWarning(
                        "Python sidecar dimension drift detected: was {Old}, now {New}. "
                        + "Keeping the original dimension until restart to avoid index corruption.",
                        Dimensions,
                        body.Dim);
                }
                else
                {
                    Dimensions = body.Dim;
                }
            }

            return body.Embedding;
        }
        catch (Exception ex) when (IsTransientSidecarOutage(ex))
        {
            _logger.LogWarning(ex,
                "Python sidecar /embed failed; falling back to bag-of-words for this call");
            return await _fallback.EmbedAsync(text, ct);
        }
    }

    /// <summary>
    /// G2 — recognise every exception shape the sidecar path can produce when
    /// the service is unavailable. Includes Polly's
    /// <see cref="Polly.ExecutionRejectedException"/> (covers
    /// <c>BrokenCircuitException</c> + timeout rejection) so circuit-breaker
    /// trips degrade to bag-of-words instead of bubbling a 500 up to the API.
    /// </summary>
    private static bool IsTransientSidecarOutage(Exception ex) =>
        ex is HttpRequestException
            or TaskCanceledException
            or InvalidOperationException
            or Polly.ExecutionRejectedException;

    private sealed record EmbedRequest(
        [property: JsonPropertyName("text")] string Text);

    private sealed record EmbedResponse(
        [property: JsonPropertyName("embedding")] float[] Embedding,
        [property: JsonPropertyName("dim")] int Dim);
}
