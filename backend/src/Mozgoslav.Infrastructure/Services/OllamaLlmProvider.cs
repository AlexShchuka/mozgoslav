using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Native Ollama provider — hits <c>/api/chat</c> so Ollama-specific options
/// (keep_alive, num_ctx, mirostat) can be added later without going through
/// the OpenAI-compat shim. <c>stream=false</c> keeps the wire format one
/// JSON object per call, matching the single-shot contract of
/// <see cref="ILlmProvider.ChatAsync"/>.
/// </summary>
public sealed class OllamaLlmProvider : ILlmProvider
{
    private const string DefaultEndpoint = "http://localhost:11434";
    private const string DefaultModel = "llama3.3";

    public const string HttpClientName = "ollama";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILogger<OllamaLlmProvider> _logger;

    public OllamaLlmProvider(IHttpClientFactory httpClientFactory, IAppSettings settings, ILogger<OllamaLlmProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    public LlmProviderKind Kind => LlmProviderKind.OllamaNative;

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct)
    {
        var endpoint = string.IsNullOrWhiteSpace(_settings.LlmEndpoint) ? DefaultEndpoint : _settings.LlmEndpoint.TrimEnd('/');
        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? DefaultModel : _settings.LlmModel;

        var body = new OllamaRequest(
            model,
            false,
            [
                new OllamaMessage("system", systemPrompt),
                new OllamaMessage("user", userMessage),
            ]);

        try
        {
            using var http = _httpClientFactory.CreateClient(HttpClientName);
            using var response = await http.PostAsJsonAsync($"{endpoint}/api/chat", body, ct);
            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadFromJsonAsync<OllamaResponse>(cancellationToken: ct);
            return payload?.Message?.Content ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ollama chat call failed");
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
