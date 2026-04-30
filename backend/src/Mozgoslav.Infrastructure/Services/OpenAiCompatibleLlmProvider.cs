using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Services;

public sealed class OpenAiCompatibleLlmProvider : ILlmProvider
{
    private const float Temperature = 0.1f;
    private const int MaxTokens = 4096;
    private const int ErrorBodyExcerptLength = 256;
    private const string DefaultModelLiteral = "default";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILlmCapabilitiesCache _capabilitiesCache;
    private readonly ILogger<OpenAiCompatibleLlmProvider> _logger;

    private Task<string>? _resolveModelTask;

    public OpenAiCompatibleLlmProvider(
        IHttpClientFactory httpClientFactory,
        IAppSettings settings,
        ILlmCapabilitiesCache capabilitiesCache,
        ILogger<OpenAiCompatibleLlmProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _capabilitiesCache = capabilitiesCache;
        _logger = logger;
    }

    public string Kind => "openai_compatible";

    public Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
        => ChatWithModelAsync(systemPrompt, userPrompt, string.Empty, ct);

    public async Task<string> ChatWithModelAsync(string systemPrompt, string userPrompt, string model, CancellationToken ct)
    {
        var endpoint = _settings.LlmEndpoint;
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            _logger.LogWarning("LLM endpoint not configured");
            return string.Empty;
        }

        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var resolvedModel = !string.IsNullOrWhiteSpace(model) ? model : await ResolveModelOnceAsync(endpoint, apiKey, ct);
        if (string.IsNullOrWhiteSpace(resolvedModel))
        {
            _logger.LogWarning("LLM model could not be resolved from settings or /v1/models");
            return string.Empty;
        }
        model = resolvedModel;

        var chatUri = new Uri(new Uri(endpoint.TrimEnd('/')), "/v1/chat/completions");
        var capabilities = _capabilitiesCache.TryGetCurrent();
        var responseFormat = capabilities?.SupportsJsonMode == true
            ? new ResponseFormat { Type = "json_object" }
            : null;

        var requestBody = new ChatCompletionRequest
        {
            Model = model,
            Temperature = Temperature,
            MaxTokens = MaxTokens,
            ResponseFormat = responseFormat,
            Messages =
            [
                new ChatMessage { Role = "system", Content = systemPrompt },
                new ChatMessage { Role = "user", Content = userPrompt }
            ]
        };

        try
        {
            using var client = _httpClientFactory.CreateClient("llm");
            var json = JsonSerializer.Serialize(requestBody, JsonOpts);
            using var request = new HttpRequestMessage(HttpMethod.Post, chatUri);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                var bodyExcerpt = body.Length <= ErrorBodyExcerptLength
                    ? body
                    : body[..ErrorBodyExcerptLength];
                _logger.LogWarning("LLM returned {StatusCode}: {BodyExcerpt}", response.StatusCode, bodyExcerpt);
                return string.Empty;
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(responseJson);
            if (doc.RootElement.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0 &&
                choices[0].TryGetProperty("message", out var msg) &&
                msg.TryGetProperty("content", out var content))
            {
                return content.GetString() ?? string.Empty;
            }

            return string.Empty;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI-compatible LLM call failed");
            return string.Empty;
        }
    }

    private Task<string> ResolveModelOnceAsync(string endpoint, string apiKey, CancellationToken ct)
    {
        var configured = _settings.LlmModel;
        if (!string.IsNullOrWhiteSpace(configured) &&
            !string.Equals(configured, DefaultModelLiteral, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(configured);
        }

        var existing = Volatile.Read(ref _resolveModelTask);
        if (existing is not null)
        {
            return existing;
        }

        var fresh = FetchFirstModelIdAsync(endpoint, apiKey, ct);
        var winner = Interlocked.CompareExchange(ref _resolveModelTask, fresh, null);
        return winner ?? fresh;
    }

    private async Task<string> FetchFirstModelIdAsync(string endpoint, string apiKey, CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");
            var modelsUri = new Uri(new Uri(endpoint.TrimEnd('/')), "/v1/models");
            using var request = new HttpRequestMessage(HttpMethod.Get, modelsUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "LLM /v1/models returned {StatusCode} during model resolution",
                    response.StatusCode);
                return string.Empty;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("data", out var data) &&
                data.ValueKind == JsonValueKind.Array &&
                data.GetArrayLength() > 0 &&
                data[0].TryGetProperty("id", out var id))
            {
                var modelId = id.GetString();
                if (!string.IsNullOrWhiteSpace(modelId))
                {
                    return modelId;
                }
            }

            _logger.LogWarning("LLM /v1/models returned no usable model id");
            return string.Empty;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM /v1/models call failed during model resolution");
            return string.Empty;
        }
    }

    private sealed class ChatCompletionRequest
    {
        [JsonPropertyName("model")] public string Model { get; init; } = string.Empty;
        [JsonPropertyName("temperature")] public float Temperature { get; init; }
        [JsonPropertyName("max_tokens")] public int MaxTokens { get; init; }
        [JsonPropertyName("response_format")] public ResponseFormat? ResponseFormat { get; init; }
        [JsonPropertyName("messages")] public ChatMessage[] Messages { get; init; } = [];
    }

    private sealed class ResponseFormat
    {
        [JsonPropertyName("type")] public string Type { get; init; } = string.Empty;
    }

    private sealed class ChatMessage
    {
        [JsonPropertyName("role")] public string Role { get; init; } = string.Empty;
        [JsonPropertyName("content")] public string Content { get; init; } = string.Empty;
    }
}
