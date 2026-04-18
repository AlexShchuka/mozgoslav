using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="ILlmProvider"/> for Ollama's native <c>/api/chat</c>
/// endpoint. <c>stream=false</c> so the full response lands in one HTTP reply.
/// Raw <see cref="HttpClient"/> (no SDK) to keep the dependency surface narrow.
/// </summary>
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

    public async Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        try
        {
            // ADR-011 step 3 — resilience lives on the named "llm" HttpClient.
            using var client = _httpClientFactory.CreateClient("llm");

            var endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/api/chat");
            var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "llama3.2" : _settings.LlmModel;

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
            // Caller cancelled — let the CancellationToken propagate upstream.
            throw;
        }
        catch (TaskCanceledException ex)
        {
            // HttpClient timeout surfaces as TaskCanceledException WITHOUT the caller
            // token being cancelled. Treat that as a transport failure, not a cancel.
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
