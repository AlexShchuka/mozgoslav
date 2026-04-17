using System.Net.Http.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

/// <summary>
/// ADR-005 D3 production path — swaps <see cref="BagOfWordsEmbeddingService"/>
/// for sentence-transformer vectors served by the Python sidecar on
/// <c>POST /api/embed</c>. When the sidecar is unreachable (process not
/// launched yet, user disabled it, port changed, …) we transparently
/// degrade to an inner fallback <see cref="IEmbeddingService"/> so the
/// RAG endpoint keeps working; the fallback is the same bag-of-words
/// service the MVP ships with, so previously-indexed notes still match.
/// </summary>
/// <remarks>
/// The service caches the first successful probe of the sidecar's
/// <c>dimensions</c> so we never return mismatched-dimension vectors
/// mid-session; if the sidecar's advertised dimension drifts (model
/// swap), we log a warning and keep the first dimension until the process
/// restarts. Dimension drift during a run would corrupt the vector
/// index, so a restart is the safe boundary.
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
        // Until we've heard from the sidecar, advertise the fallback
        // dimensions so the RAG layer can size its buffers.
        Dimensions = fallback.Dimensions;
    }

    public int Dimensions { get; set; }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct)
    {
        try
        {
            var request = new EmbedRequest([text ?? string.Empty]);
            using var response = await _httpClient.PostAsJsonAsync("/api/embed", request, ct);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<EmbedResponse>(ct)
                ?? throw new InvalidOperationException("Sidecar returned null body");

            if (body.Vectors.Count == 0 || body.Vectors[0].Length == 0)
            {
                throw new InvalidOperationException("Sidecar returned empty vector");
            }

            if (Dimensions != body.Dimensions)
            {
                if (Dimensions != _fallback.Dimensions)
                {
                    _logger.LogWarning(
                        "Python sidecar dimension drift detected: was {Old}, now {New}. "
                        + "Keeping the original dimension until restart to avoid index corruption.",
                        Dimensions,
                        body.Dimensions);
                }
                else
                {
                    Dimensions = body.Dimensions;
                }
            }

            return body.Vectors[0];
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            _logger.LogWarning(ex,
                "Python sidecar /embed failed; falling back to bag-of-words for this call");
            return await _fallback.EmbedAsync(text, ct);
        }
    }

    private sealed record EmbedRequest(
        [property: JsonPropertyName("texts")] IReadOnlyList<string> Texts);

    private sealed record EmbedResponse(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("dimensions")] int Dimensions,
        [property: JsonPropertyName("vectors")] IReadOnlyList<float[]> Vectors);
}
