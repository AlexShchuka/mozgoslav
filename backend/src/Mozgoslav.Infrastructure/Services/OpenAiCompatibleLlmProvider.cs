using System.ClientModel;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using OpenAI;
using OpenAI.Chat;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Default provider — any OpenAI-compatible endpoint (LM Studio, OpenAI, Groq,
/// OpenRouter, Ollama's /v1 shim). Kept thin: no JSON parsing, no chunking —
/// those live in <c>LlmChunker</c> and the owning <see cref="ILlmService"/>.
/// </summary>
public sealed class OpenAiCompatibleLlmProvider : ILlmProvider
{
    private const float Temperature = 0.1f;
    private const int MaxTokens = 4096;

    private readonly IAppSettings _settings;
    private readonly ILogger<OpenAiCompatibleLlmProvider> _logger;

    public OpenAiCompatibleLlmProvider(IAppSettings settings, ILogger<OpenAiCompatibleLlmProvider> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public LlmProviderKind Kind => LlmProviderKind.OpenAiCompatible;

    public async Task<string> ChatAsync(string systemPrompt, string userMessage, CancellationToken ct)
    {
        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var options = new OpenAIClientOptions { Endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/v1") };
        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "default" : _settings.LlmModel;

        var chatClient = new OpenAIClient(new ApiKeyCredential(apiKey), options).GetChatClient(model);
        var completionOptions = new ChatCompletionOptions
        {
            Temperature = Temperature,
            MaxOutputTokenCount = MaxTokens,
            ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
        };
        var messages = new ChatMessage[]
        {
            ChatMessage.CreateSystemMessage(systemPrompt),
            ChatMessage.CreateUserMessage(userMessage),
        };
        try
        {
            var response = await chatClient.CompleteChatAsync(messages, completionOptions, ct);
            return response.Value.Content.Count > 0 ? response.Value.Content[0].Text : string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI-compatible chat call failed");
            return string.Empty;
        }
    }
}
