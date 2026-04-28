using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Exceptions;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

public sealed class PythonSidecarEmbeddingService : IEmbeddingService
{
    private const string SidecarName = "python-sidecar";

    private readonly HttpClient _httpClient;
    private readonly ILogger<PythonSidecarEmbeddingService> _logger;

    public PythonSidecarEmbeddingService(
        HttpClient httpClient,
        ILogger<PythonSidecarEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        Dimensions = 384;
    }

    public int Dimensions { get; private set; }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct)
    {
        EmbedResponse? body;
        try
        {
            var request = new EmbedRequest(text);
            using var response = await _httpClient.PostAsJsonAsync("/api/embed", request, ct);
            response.EnsureSuccessStatusCode();
            body = await response.Content.ReadFromJsonAsync<EmbedResponse>(ct);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "python-sidecar /api/embed unavailable");
            throw new SidecarUnavailableException(SidecarName, ex);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogError(ex, "python-sidecar /api/embed timed out");
            throw new SidecarUnavailableException(SidecarName, ex);
        }

        if (body is null)
        {
            throw new InvalidOperationException("Sidecar returned null body for /api/embed");
        }

        if (body.Embedding is null || body.Embedding.Length == 0)
        {
            throw new InvalidOperationException("Sidecar returned empty vector for /api/embed");
        }

        if (Dimensions != body.Dim)
        {
            _logger.LogWarning(
                "Python sidecar dimension drift: was {Old}, now {New}. Updating dimension.",
                Dimensions,
                body.Dim);
            Dimensions = body.Dim;
        }

        return body.Embedding;
    }

    private sealed record EmbedRequest(
        [property: JsonPropertyName("text")] string Text);

    private sealed record EmbedResponse(
        [property: JsonPropertyName("embedding")] float[] Embedding,
        [property: JsonPropertyName("dim")] int Dim);
}
