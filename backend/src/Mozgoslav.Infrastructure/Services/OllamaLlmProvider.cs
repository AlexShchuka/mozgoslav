using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class OllamaLlmProvider : ILlmProvider
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IAppSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OllamaLlmProvider> _logger;

    public OllamaLlmProvider(
        IAppSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OllamaLlmProvider> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public string Kind => "ollama";

    public Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
        => ChatWithModelAsync(systemPrompt, userPrompt, string.Empty, ct);

    public async Task<string> ChatWithModelAsync(string systemPrompt, string userPrompt, string model, CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");

            var endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/api/chat");
            var resolvedModel = !string.IsNullOrWhiteSpace(model)
                ? model
                : (string.IsNullOrWhiteSpace(_settings.LlmModel) ? "llama3.2" : _settings.LlmModel);
            model = resolvedModel;

            var payload = new OllamaRequest(
                Model: model,
                Stream: false,
                Messages:
                [
                    new OllamaMessage("system", systemPrompt),
                    new OllamaMessage("user", userPrompt),
                ]);

            using var response = await client.PostAsJsonAsync(endpoint, payload, JsonOptions, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Ollama /api/chat returned {StatusCode} for model {Model}",
                    (int)response.StatusCode, model);
                return string.Empty;
            }

            var body = await response.Content.ReadFromJsonAsync<OllamaResponse>(JsonOptions, ct);
            return body?.Message?.Content ?? string.Empty;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Ollama LLM call timed out");
            return string.Empty;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Ollama LLM call failed (network)");
            return string.Empty;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Ollama response was not valid JSON");
            return string.Empty;
        }
    }

    private sealed record OllamaRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("stream")] bool Stream,
        [property: JsonPropertyName("messages")] IReadOnlyList<OllamaMessage> Messages);

    private sealed record OllamaMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record OllamaResponse(
        [property: JsonPropertyName("message")] OllamaMessage? Message);
}
