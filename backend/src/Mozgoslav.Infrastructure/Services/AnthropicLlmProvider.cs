using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class AnthropicLlmProvider : ILlmProvider
{
    private const int MaxTokens = 4096;
    private const string DefaultAnthropicVersion = "2023-06-01";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IAppSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AnthropicLlmProvider> _logger;

    public AnthropicLlmProvider(
        IAppSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<AnthropicLlmProvider> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public string Kind => "anthropic";

    public async Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");

            var endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/v1/messages");
            var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "claude-3-5-sonnet-latest" : _settings.LlmModel;

            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = JsonContent.Create(
                    new AnthropicRequest(
                        Model: model,
                        MaxTokens: MaxTokens,
                        System: systemPrompt,
                        Messages: [new AnthropicMessage("user", userPrompt)]),
                    options: JsonOptions),
            };
            if (!string.IsNullOrWhiteSpace(_settings.LlmApiKey))
            {
                request.Headers.Add("x-api-key", _settings.LlmApiKey);
            }
            request.Headers.Add("anthropic-version", DefaultAnthropicVersion);

            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Anthropic Messages API returned {StatusCode} for model {Model}",
                    (int)response.StatusCode, model);
                return string.Empty;
            }

            var payload = await response.Content.ReadFromJsonAsync<AnthropicResponse>(JsonOptions, ct);
            if (payload is null || payload.Content is null || payload.Content.Count == 0)
            {
                return string.Empty;
            }

            var text = string.Concat(payload.Content
                .Where(c => string.Equals(c.Type, "text", StringComparison.Ordinal))
                .Select(c => c.Text ?? string.Empty));
            return text;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Anthropic LLM call timed out");
            return string.Empty;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Anthropic LLM call failed (network)");
            return string.Empty;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Anthropic response was not valid JSON");
            return string.Empty;
        }
    }

    private sealed record AnthropicRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("max_tokens")] int MaxTokens,
        [property: JsonPropertyName("system")] string System,
        [property: JsonPropertyName("messages")] IReadOnlyList<AnthropicMessage> Messages);

    private sealed record AnthropicMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record AnthropicResponse(
        [property: JsonPropertyName("content")] IReadOnlyList<AnthropicContentBlock>? Content);

    private sealed record AnthropicContentBlock(
        [property: JsonPropertyName("type")] string? Type,
        [property: JsonPropertyName("text")] string? Text);
}
