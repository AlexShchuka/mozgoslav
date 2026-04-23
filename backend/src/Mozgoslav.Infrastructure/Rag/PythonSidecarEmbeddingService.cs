using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

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
            var request = new EmbedRequest(text);
            using var response = await _httpClient.PostAsJsonAsync("/api/embed", request, ct);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<EmbedResponse>(ct)
                ?? throw new InvalidOperationException("Sidecar returned null body");

            if (body.Embedding is null || body.Embedding.Length == 0)
            {
                throw new InvalidOperationException("Sidecar returned empty vector");
            }

            if (Dimensions == body.Dim)
            {
                return body.Embedding;
            }
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

            return body.Embedding;
        }
        catch (Exception ex) when (IsTransientSidecarOutage(ex))
        {
            _logger.LogWarning(ex,
                "Python sidecar /embed failed; falling back to bag-of-words for this call");
            return await _fallback.EmbedAsync(text, ct);
        }
    }

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
