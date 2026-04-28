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

namespace Mozgoslav.Infrastructure.Services;

public sealed class OpenAiCompatibleLlmProvider : ILlmProvider
{
    private const float Temperature = 0.1f;
    private const int MaxTokens = 4096;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILogger<OpenAiCompatibleLlmProvider> _logger;

    public OpenAiCompatibleLlmProvider(
        IHttpClientFactory httpClientFactory,
        IAppSettings settings,
        ILogger<OpenAiCompatibleLlmProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    public string Kind => "openai_compatible";

    public async Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var endpoint = _settings.LlmEndpoint;
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            _logger.LogWarning("LLM endpoint not configured");
            return string.Empty;
        }

        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "default" : _settings.LlmModel;
        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var chatUri = new Uri(new Uri(endpoint.TrimEnd('/')), "/v1/chat/completions");

        var requestBody = new ChatCompletionRequest
        {
            Model = model,
            Temperature = Temperature,
            MaxTokens = MaxTokens,
            ResponseFormat = new ResponseFormat { Type = "json_object" },
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
                _logger.LogWarning("LLM returned {StatusCode}", response.StatusCode);
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
