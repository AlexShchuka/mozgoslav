using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

public sealed class RerankerOptions
{
    public const string SectionName = "Mozgoslav:Rag:Reranker";
    public string ModelId { get; set; } = "BAAI/bge-reranker-v2-m3";
    public bool Enabled { get; set; } = true;
    public int TopK { get; set; } = 5;
}

public sealed class BgeRerankerProvider : IReranker
{
    private readonly HttpClient _httpClient;
    private readonly RerankerOptions _options;
    private readonly ILogger<BgeRerankerProvider> _logger;

    public BgeRerankerProvider(
        HttpClient httpClient,
        IOptions<RerankerOptions> options,
        ILogger<BgeRerankerProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RerankedChunk>> RerankAsync(
        string query,
        IReadOnlyList<RetrievedChunk> chunks,
        int topK,
        CancellationToken ct)
    {
        if (chunks.Count == 0)
        {
            return [];
        }

        if (!_options.Enabled)
        {
            return chunks
                .Take(topK)
                .Select(c => new RerankedChunk(c, c.Score))
                .ToArray();
        }

        var request = new RerankRequest(
            ModelId: _options.ModelId,
            Query: query,
            Chunks: chunks.Select(c => new ChunkDto(c.ChunkId, c.Text)).ToArray());

        try
        {
            using var response = await _httpClient.PostAsJsonAsync("/api/rerank", request, ct);
            response.EnsureSuccessStatusCode();
            var scores = await response.Content.ReadFromJsonAsync<RerankResponse[]>(ct)
                ?? [];

            var scoreById = scores.ToDictionary(
                s => s.Id,
                s => s.Score,
                StringComparer.Ordinal);

            var byId = chunks.ToDictionary(c => c.ChunkId, StringComparer.Ordinal);

            return scoreById
                .OrderByDescending(kv => kv.Value)
                .Take(topK)
                .Where(kv => byId.ContainsKey(kv.Key))
                .Select(kv => new RerankedChunk(byId[kv.Key], kv.Value))
                .ToArray();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "Reranker sidecar call failed; returning top-K by retrieval score");
            return chunks
                .Take(topK)
                .Select(c => new RerankedChunk(c, c.Score))
                .ToArray();
        }
    }

    private sealed record RerankRequest(
        [property: JsonPropertyName("model_id")] string ModelId,
        [property: JsonPropertyName("query")] string Query,
        [property: JsonPropertyName("chunks")] ChunkDto[] Chunks);

    private sealed record ChunkDto(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("text")] string Text);

    private sealed record RerankResponse(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("score")] double Score);
}
