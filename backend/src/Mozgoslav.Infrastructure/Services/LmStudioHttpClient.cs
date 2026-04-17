using System.Net.Http.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Queries the OpenAI-compatible <c>/v1/models</c> endpoint of a running LM
/// Studio. When LM Studio is not running (or the configured endpoint is not
/// OpenAI-compatible) this returns an empty list rather than raising — the UI
/// simply shows "LM Studio is offline / no models loaded".
/// </summary>
public sealed class LmStudioHttpClient : ILmStudioClient
{
    private readonly HttpClient _http;
    private readonly ILogger<LmStudioHttpClient> _logger;
    private readonly IAppSettings _settings;

    public LmStudioHttpClient(HttpClient http, IAppSettings settings, ILogger<LmStudioHttpClient> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
    }

    public async Task<LmStudioDiscoveryResult> ListModelsAsync(CancellationToken ct)
    {
        var snapshot = await _settings.LoadAsync(ct);
        var endpoint = snapshot.LlmEndpoint?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return new LmStudioDiscoveryResult([], Reachable: false);
        }

        var url = endpoint.EndsWith("/v1", StringComparison.Ordinal)
            ? $"{endpoint}/models"
            : $"{endpoint}/v1/models";

        try
        {
            var response = await _http.GetFromJsonAsync<ModelsEnvelope>(url, ct);
            var installed = response?.Data?.Select(m => new LmStudioModel(m.Id, m.Object)).ToArray()
                ?? Array.Empty<LmStudioModel>();
            return new LmStudioDiscoveryResult(installed, Reachable: true);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogDebug(ex, "LM Studio discovery failed for {Url}", url);
            return new LmStudioDiscoveryResult([], Reachable: false);
        }
        catch (TaskCanceledException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Unexpected LM Studio discovery failure for {Url}", url);
            return new LmStudioDiscoveryResult([], Reachable: false);
        }
    }

    private sealed record ModelsEnvelope(
        [property: JsonPropertyName("object")] string Object,
        [property: JsonPropertyName("data")] IReadOnlyList<ModelEntry> Data);

    private sealed record ModelEntry(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("object")] string Object);
}
