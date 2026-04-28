using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.WebSearch;

public sealed class SearXNGProvider : IWebSearch
{
    public const string HttpClientName = "Mozgoslav.SearXNG";

    private readonly HttpClient _httpClient;
    private readonly ILogger<SearXNGProvider> _logger;

    public SearXNGProvider(HttpClient httpClient, ILogger<SearXNGProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<IReadOnlyList<WebSearchResult>> SearchAsync(
        string query, int top, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        try
        {
            var uri = new Uri(
                $"/search?q={Uri.EscapeDataString(query)}&format=json&pageno=1",
                UriKind.Relative);

            using var response = await _httpClient.GetAsync(uri, ct);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<SearXNGResponse>(ct);
            if (body?.Results is null || body.Results.Count == 0)
            {
                return [];
            }

            var taken = Math.Min(top, body.Results.Count);
            var results = new List<WebSearchResult>(taken);
            for (var i = 0; i < taken; i++)
            {
                var r = body.Results[i];
                results.Add(new WebSearchResult(
                    Title: r.Title ?? string.Empty,
                    Url: r.Url ?? string.Empty,
                    Snippet: r.Content ?? string.Empty));
            }

            return results;
        }
        catch (Exception ex) when (IsTransient(ex))
        {
            _logger.LogWarning(ex, "SearXNG sidecar unavailable; returning empty results");
            return [];
        }
    }

    private static bool IsTransient(Exception ex) =>
        ex is HttpRequestException or TaskCanceledException or OperationCanceledException
            or Polly.ExecutionRejectedException;

    private sealed record SearXNGResponse(
        [property: JsonPropertyName("results")] List<SearXNGResult>? Results);

    private sealed record SearXNGResult(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("url")] string? Url,
        [property: JsonPropertyName("content")] string? Content);
}
