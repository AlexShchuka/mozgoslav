using System;
using System.ClientModel;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

using OpenAI;
using OpenAI.Chat;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="ILlmProvider"/> for any OpenAI-compatible endpoint
/// (LM Studio, Ollama's OpenAI adapter, llama.cpp HTTP server, etc.). Uses the
/// official OpenAI .NET SDK; the base URL + API key + model come from
/// <see cref="IAppSettings"/>. Network-level failures log a WARN and return an
/// empty string so the pipeline falls back to the raw transcript (BC-013).
/// </summary>
public sealed class OpenAiCompatibleLlmProvider : ILlmProvider
{
    private const float Temperature = 0.1f;
    private const int MaxTokens = 4096;

    private readonly IAppSettings _settings;
    private readonly ILogger<OpenAiCompatibleLlmProvider> _logger;

    public OpenAiCompatibleLlmProvider(
        IAppSettings settings,
        ILogger<OpenAiCompatibleLlmProvider> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public string Kind => "openai_compatible";

    public async Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        var client = CreateClient();
        var completionOptions = new ChatCompletionOptions
        {
            Temperature = Temperature,
            MaxOutputTokenCount = MaxTokens,
            ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
        };

        var messages = new ChatMessage[]
        {
            ChatMessage.CreateSystemMessage(systemPrompt),
            ChatMessage.CreateUserMessage(userPrompt)
        };

        try
        {
            ChatCompletion response = await client.CompleteChatAsync(messages, completionOptions, ct);
            return response.Content.Count > 0 ? response.Content[0].Text : string.Empty;
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

    private ChatClient CreateClient()
    {
        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var credential = new ApiKeyCredential(apiKey);
        var options = new OpenAIClientOptions
        {
            Endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/v1")
        };
        var openAiClient = new OpenAIClient(credential, options);
        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "default" : _settings.LlmModel;
        return openAiClient.GetChatClient(model);
    }
}
