using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Services;

public sealed class OpenAiCompatibleModelCatalogService : IModelCatalogService
{
    private const string DefaultModelLiteral = "default";
    private const string LlmHttpClientName = "llm";
    private static readonly TimeSpan FetchTimeout = TimeSpan.FromSeconds(5);

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILlmCapabilitiesCache _capabilitiesCache;
    private readonly ILogger<OpenAiCompatibleModelCatalogService> _logger;

    public OpenAiCompatibleModelCatalogService(
        IHttpClientFactory httpClientFactory,
        IAppSettings settings,
        ILlmCapabilitiesCache capabilitiesCache,
        ILogger<OpenAiCompatibleModelCatalogService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _capabilitiesCache = capabilitiesCache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<LlmModelDescriptor>> GetAvailableAsync(CancellationToken ct)
    {
        var endpoint = _settings.LlmEndpoint;
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return [];
        }

        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var entries = await FetchModelEntriesAsync(endpoint, apiKey, ct);
        if (entries.Count == 0)
        {
            return [];
        }

        var resolvedModelId = ResolveCurrentModelId(entries);
        var capabilities = _capabilitiesCache.TryGetCurrent();

        var result = new List<LlmModelDescriptor>(entries.Count);
        foreach (var entry in entries)
        {
            if (string.IsNullOrWhiteSpace(entry.Id))
            {
                continue;
            }

            if (capabilities is not null && string.Equals(entry.Id, resolvedModelId, StringComparison.Ordinal))
            {
                result.Add(new LlmModelDescriptor(
                    Id: entry.Id,
                    OwnedBy: string.IsNullOrWhiteSpace(entry.OwnedBy) ? null : entry.OwnedBy,
                    ContextLength: capabilities.CtxLength > 0 ? capabilities.CtxLength : null,
                    SupportsToolCalling: capabilities.SupportsToolCalling,
                    SupportsJsonMode: capabilities.SupportsJsonMode));
            }
            else
            {
                result.Add(new LlmModelDescriptor(
                    Id: entry.Id,
                    OwnedBy: string.IsNullOrWhiteSpace(entry.OwnedBy) ? null : entry.OwnedBy,
                    ContextLength: null,
                    SupportsToolCalling: null,
                    SupportsJsonMode: null));
            }
        }

        return result;
    }

    private string ResolveCurrentModelId(IReadOnlyList<OpenAiModelEntry> entries)
    {
        var configured = _settings.LlmModel;
        if (!string.IsNullOrWhiteSpace(configured) &&
            !string.Equals(configured, DefaultModelLiteral, StringComparison.OrdinalIgnoreCase))
        {
            return configured;
        }

        return entries.Count > 0 ? entries[0].Id : string.Empty;
    }

    private async Task<IReadOnlyList<OpenAiModelEntry>> FetchModelEntriesAsync(
        string endpoint,
        string apiKey,
        CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient(LlmHttpClientName);
            using var fetchCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            fetchCts.CancelAfter(FetchTimeout);
            var modelsUri = new Uri(new Uri(endpoint.TrimEnd('/')), "/v1/models");
            using var request = new HttpRequestMessage(HttpMethod.Get, modelsUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await client.SendAsync(request, fetchCts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogDebug(
                    "LLM /v1/models returned {StatusCode} during catalog fetch",
                    response.StatusCode);
                return [];
            }

            await using var stream = await response.Content.ReadAsStreamAsync(fetchCts.Token);
            var envelope = await JsonSerializer.DeserializeAsync<OpenAiModelsEnvelope>(
                stream, JsonOpts, fetchCts.Token);
            return envelope?.Data ?? [];
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            _logger.LogDebug("LLM /v1/models fetch timed out");
            return [];
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "LLM /v1/models catalog fetch failed");
            return [];
        }
    }

    private sealed class OpenAiModelsEnvelope
    {
        [JsonPropertyName("data")]
        public List<OpenAiModelEntry> Data { get; init; } = [];
    }

    private sealed class OpenAiModelEntry
    {
        [JsonPropertyName("id")]
        public string Id { get; init; } = string.Empty;

        [JsonPropertyName("owned_by")]
        public string? OwnedBy { get; init; }
    }
}
