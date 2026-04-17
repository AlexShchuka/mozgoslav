using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Anthropic Messages API provider. Kept separate from the OpenAI shim because
/// the wire schema differs materially (system as a top-level field, content
/// array with type=text blocks). No streaming yet — chunked transcripts round-
/// trip one call per chunk via <c>LlmChunker</c>.
/// </summary>
public sealed class AnthropicLlmProvider : ILlmProvider
{
    private const string DefaultEndpoint = "https://api.anthropic.com";
    private const string DefaultModel = "claude-sonnet-4-6";
    private const string AnthropicVersion = "2023-06-01";
    private const int MaxTokens = 4096;

    public const string HttpClientName = "anthropic";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppSettings _settings;
    private readonly ILogger<AnthropicLlmProvider> _logger;

    public AnthropicLlmProvider(IHttpClientFactory httpClientFactory, IAppSettings settings, ILogger<AnthropicLlmProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
        _logger = logger;
    }

    public LlmProviderKind Kind => LlmProviderKind.Anthropic;

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct)
    {
        var endpoint = string.IsNullOrWhiteSpace(_settings.LlmEndpoint) ? DefaultEndpoint : _settings.LlmEndpoint.TrimEnd('/');
        var url = $"{endpoint}/v1/messages";
        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? DefaultModel : _settings.LlmModel;

        var body = new AnthropicRequest(
            model,
            MaxTokens,
            systemPrompt,
            [new AnthropicMessage("user", userMessage)]);

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("x-api-key", _settings.LlmApiKey ?? string.Empty);
        request.Headers.Add("anthropic-version", AnthropicVersion);

        try
        {
            using var http = _httpClientFactory.CreateClient(HttpClientName);
            using var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            var payload = await response.Content.ReadFromJsonAsync<AnthropicResponse>(cancellationToken: ct);
            return payload?.Content?.FirstOrDefault(c => c.Type == "text")?.Text ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Anthropic chat call failed");
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
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string Text);
}
