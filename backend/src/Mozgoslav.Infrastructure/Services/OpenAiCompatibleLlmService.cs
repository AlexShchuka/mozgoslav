using System.ClientModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;
using OpenAI;
using OpenAI.Chat;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Talks to any OpenAI-compatible endpoint (LM Studio, Ollama with --openai-like
/// adapters, etc.) configured in <see cref="IAppSettings.LlmEndpoint"/>. Returns a
/// strongly-typed <see cref="LlmProcessingResult"/>, falling back gracefully when
/// the model returns non-JSON output or the endpoint is unreachable.
/// </summary>
public sealed class OpenAiCompatibleLlmService : ILlmService
{
    private const float Temperature = 0.1f;
    private const int MaxTokens = 4096;

    private readonly IAppSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenAiCompatibleLlmService> _logger;

    public OpenAiCompatibleLlmService(
        IAppSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAiCompatibleLlmService> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");
            client.Timeout = TimeSpan.FromSeconds(3);
            var response = await client.GetAsync(
                new Uri(new Uri(_settings.LlmEndpoint), "/v1/models"), ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "LLM availability check failed");
            return false;
        }
    }

    public async Task<LlmProcessingResult> ProcessAsync(string transcript, string systemPrompt, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(systemPrompt);
        if (string.IsNullOrWhiteSpace(transcript))
        {
            return Empty();
        }

        var chunks = Chunk(transcript, maxChars: 24_000);
        var merged = Empty();

        foreach (var chunk in chunks)
        {
            var result = await CallAsync(chunk, systemPrompt, ct);
            merged = Merge(merged, result);
        }

        return merged;
    }

    private async Task<LlmProcessingResult> CallAsync(string text, string systemPrompt, CancellationToken ct)
    {
        var client = CreateClient();
        var completionOptions = new ChatCompletionOptions
        {
            Temperature = Temperature,
            MaxOutputTokenCount = MaxTokens,
            ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
        };

        var messages = new ChatMessage[]
        {
            ChatMessage.CreateSystemMessage(systemPrompt),
            ChatMessage.CreateUserMessage(text),
        };

        ChatCompletion response;
        try
        {
            response = await client.CompleteChatAsync(messages, completionOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM call failed");
            return Empty();
        }

        var rawContent = response.Content.Count > 0 ? response.Content[0].Text : string.Empty;
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return Empty();
        }

        return ParseOrRepair(rawContent);
    }

    private ChatClient CreateClient()
    {
        var apiKey = string.IsNullOrWhiteSpace(_settings.LlmApiKey) ? "lm-studio" : _settings.LlmApiKey;
        var credential = new ApiKeyCredential(apiKey);
        var options = new OpenAIClientOptions
        {
            Endpoint = new Uri(new Uri(_settings.LlmEndpoint), "/v1"),
        };
        var openAiClient = new OpenAIClient(credential, options);
        var model = string.IsNullOrWhiteSpace(_settings.LlmModel) ? "default" : _settings.LlmModel;
        return openAiClient.GetChatClient(model);
    }

    private LlmProcessingResult ParseOrRepair(string rawContent)
    {
        var json = ExtractJson(rawContent);
        try
        {
            var dto = JsonSerializer.Deserialize<LlmJsonDto>(json, JsonOptions)
                ?? throw new JsonException("Empty deserialization");
            return dto.ToDomain();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "LLM returned non-JSON payload; falling back to raw summary");
            return Empty() with { Summary = rawContent.Trim() };
        }
    }

    private static string ExtractJson(string content)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            return content.Substring(start, end - start + 1);
        }
        return content;
    }

    private static IEnumerable<string> Chunk(string text, int maxChars)
    {
        if (text.Length <= maxChars)
        {
            yield return text;
            yield break;
        }

        for (var i = 0; i < text.Length; i += maxChars)
        {
            yield return text.Substring(i, Math.Min(maxChars, text.Length - i));
        }
    }

    private static LlmProcessingResult Merge(LlmProcessingResult a, LlmProcessingResult b) => new(
        Summary: CombineSummaries(a.Summary, b.Summary),
        KeyPoints: Combine(a.KeyPoints, b.KeyPoints),
        Decisions: Combine(a.Decisions, b.Decisions),
        ActionItems: Combine(a.ActionItems, b.ActionItems),
        UnresolvedQuestions: Combine(a.UnresolvedQuestions, b.UnresolvedQuestions),
        Participants: Combine(a.Participants, b.Participants),
        Topic: string.IsNullOrWhiteSpace(a.Topic) ? b.Topic : a.Topic,
        ConversationType: a.ConversationType == ConversationType.Other ? b.ConversationType : a.ConversationType,
        Tags: Combine(a.Tags, b.Tags));

    private static string CombineSummaries(string a, string b)
    {
        if (string.IsNullOrWhiteSpace(a)) return b;
        if (string.IsNullOrWhiteSpace(b)) return a;
        return a + "\n\n" + b;
    }

    private static IReadOnlyList<T> Combine<T>(IReadOnlyList<T> a, IReadOnlyList<T> b) =>
        a.Concat(b).Distinct().ToList();

    private static LlmProcessingResult Empty() => new(
        Summary: string.Empty,
        KeyPoints: [],
        Decisions: [],
        ActionItems: [],
        UnresolvedQuestions: [],
        Participants: [],
        Topic: string.Empty,
        ConversationType: ConversationType.Other,
        Tags: []);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
    };

    private sealed class LlmJsonDto
    {
        [JsonPropertyName("summary")] public string Summary { get; init; } = string.Empty;
        [JsonPropertyName("key_points")] public List<string> KeyPoints { get; init; } = [];
        [JsonPropertyName("decisions")] public List<string> Decisions { get; init; } = [];
        [JsonPropertyName("action_items")] public List<ActionItemDto> ActionItems { get; init; } = [];
        [JsonPropertyName("unresolved_questions")] public List<string> UnresolvedQuestions { get; init; } = [];
        [JsonPropertyName("participants")] public List<string> Participants { get; init; } = [];
        [JsonPropertyName("topic")] public string Topic { get; init; } = string.Empty;
        [JsonPropertyName("conversation_type")] public string? ConversationType { get; init; }
        [JsonPropertyName("tags")] public List<string> Tags { get; init; } = [];

        public LlmProcessingResult ToDomain() => new(
            Summary: Summary ?? string.Empty,
            KeyPoints: KeyPoints ?? [],
            Decisions: Decisions ?? [],
            ActionItems: (ActionItems ?? []).Select(a => a.ToDomain()).ToList(),
            UnresolvedQuestions: UnresolvedQuestions ?? [],
            Participants: Participants ?? [],
            Topic: Topic ?? string.Empty,
            ConversationType: ParseConversationType(ConversationType),
            Tags: Tags ?? []);
    }

    private sealed class ActionItemDto
    {
        [JsonPropertyName("person")] public string Person { get; init; } = string.Empty;
        [JsonPropertyName("task")] public string Task { get; init; } = string.Empty;
        [JsonPropertyName("deadline")] public string? Deadline { get; init; }

        public ActionItem ToDomain() => new(Person ?? string.Empty, Task ?? string.Empty, Deadline);
    }

    private static ConversationType ParseConversationType(string? value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "meeting" => ConversationType.Meeting,
        "1:1" or "one_on_one" or "oneonone" => ConversationType.OneOnOne,
        "idea" => ConversationType.Idea,
        "personal" => ConversationType.Personal,
        _ => ConversationType.Other,
    };
}
