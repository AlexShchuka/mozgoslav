using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.WebSearch;

public sealed class TrafilaturaProvider : IWebContentExtractor
{
    public const string HttpClientName = "Mozgoslav.PythonSidecar";

    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheTtl;
    private readonly ILogger<TrafilaturaProvider> _logger;

    public TrafilaturaProvider(
        HttpClient httpClient,
        IMemoryCache cache,
        TimeSpan cacheTtl,
        ILogger<TrafilaturaProvider> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _cacheTtl = cacheTtl;
        _logger = logger;
    }

    public async Task<WebContent> ExtractAsync(string url, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);

        var cacheKey = $"web-extract:{url}";
        if (_cache.TryGetValue(cacheKey, out WebContent? cached) && cached is not null)
        {
            return cached;
        }

        try
        {
            var request = new ExtractRequest(url);
            using var response = await _httpClient.PostAsJsonAsync("/api/web-extract", request, ct);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<ExtractResponse>(ct)
                ?? throw new InvalidOperationException("Sidecar returned null body for web-extract");

            var result = new WebContent(
                Title: body.Title ?? string.Empty,
                Body: body.Body ?? string.Empty,
                Lang: body.Lang,
                Excerpt: body.Excerpt);

            _cache.Set(cacheKey, result, _cacheTtl);
            return result;
        }
        catch (Exception ex) when (IsTransient(ex))
        {
            _logger.LogWarning(ex, "python-sidecar /api/web-extract failed for {Url}", url);
            return new WebContent(Title: string.Empty, Body: string.Empty, Lang: null, Excerpt: null);
        }
    }

    private static bool IsTransient(Exception ex) =>
        ex is HttpRequestException or TaskCanceledException or OperationCanceledException
            or Polly.ExecutionRejectedException;

    private sealed record ExtractRequest(
        [property: JsonPropertyName("url")] string Url);

    private sealed record ExtractResponse(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("body")] string? Body,
        [property: JsonPropertyName("lang")] string? Lang,
        [property: JsonPropertyName("excerpt")] string? Excerpt);
}
