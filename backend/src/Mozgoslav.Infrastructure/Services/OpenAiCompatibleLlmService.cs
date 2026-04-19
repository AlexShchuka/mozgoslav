using System.Text.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;
using Microsoft.ML.Tokenizers;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Thin adapter implementing <see cref="ILlmService"/> by delegating
/// the transport to whatever <see cref="ILlmProvider"/> the
/// <see cref="ILlmProviderFactory"/> selects at runtime. Keeps the legacy
/// JSON-schema parsing + chunking pipeline; the provider only has to hand back
/// a single string.
/// <para>
/// Kept under the original class name so the rest of the codebase does not
/// need to change DI bindings; <c>ILlmService</c> is still the upstream-facing
/// port.
/// </para>
/// </summary>
public sealed class OpenAiCompatibleLlmService : ILlmService
{
    private const int MaxTokensPerChunk = 6_000;
    private static readonly Tokenizer SharedTokenizer = TiktokenTokenizer.CreateForModel("gpt-4");

    private readonly ILlmProviderFactory _providerFactory;
    private readonly IAppSettings _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenAiCompatibleLlmService> _logger;

    public OpenAiCompatibleLlmService(
        ILlmProviderFactory providerFactory,
        IAppSettings settings,
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAiCompatibleLlmService> logger)
    {
        _providerFactory = providerFactory;
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<bool> IsAvailableAsync(CancellationToken ct)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient("llm");
            using var probeCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            probeCts.CancelAfter(TimeSpan.FromSeconds(3));
            using var response = await client.GetAsync(
                new Uri(new Uri(_settings.LlmEndpoint), "/v1/models"), probeCts.Token);
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

        var provider = await _providerFactory.GetCurrentAsync(ct);
        var chunks = ChunkByTokens(transcript, MaxTokensPerChunk);
        var merged = Empty();

        foreach (var chunk in chunks)
        {
            var rawContent = await provider.ChatAsync(systemPrompt, chunk, ct);
            var result = string.IsNullOrWhiteSpace(rawContent) ? Empty() : ParseOrRepair(rawContent);
            merged = Merge(merged, result);
        }

        return merged;
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
        var start = content.IndexOf('{', StringComparison.Ordinal);
        var end = content.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            return content.Substring(start, end - start + 1);
        }
        return content;
    }

    /// <summary>
    /// ADR-011 step 4 — token-aware splitter. Uses <see cref="TiktokenTokenizer"/>
    /// (cl100k_base) to encode the full transcript once, then rebuilds contiguous
    /// slices of at most <paramref name="maxTokens"/> tokens back into their
    /// source substrings via the token offset map. The result never exceeds the
    /// upstream LLM's per-call budget, unlike the pre-ADR character heuristic
    /// that could overshoot by ~3-4x on dense Cyrillic text.
    /// </summary>
    internal static IEnumerable<string> ChunkByTokens(string text, int maxTokens)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxTokens);
        if (string.IsNullOrEmpty(text))
        {
            yield break;
        }

        var encoding = SharedTokenizer.EncodeToTokens(text, out _);
        if (encoding.Count == 0)
        {
            yield return text;
            yield break;
        }
        if (encoding.Count <= maxTokens)
        {
            yield return text;
            yield break;
        }

        var sliceStart = encoding[0].Offset.Start.Value;
        var tokensInSlice = 0;
        for (var i = 0; i < encoding.Count; i++)
        {
            tokensInSlice++;
            if (tokensInSlice < maxTokens && i < encoding.Count - 1)
            {
                continue;
            }
            var sliceEnd = encoding[i].Offset.End.Value;
            yield return text[sliceStart..sliceEnd];
            if (i < encoding.Count - 1)
            {
                sliceStart = encoding[i + 1].Offset.Start.Value;
                tokensInSlice = 0;
            }
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
        if (string.IsNullOrWhiteSpace(a))
        {
            return b;
        }
        if (string.IsNullOrWhiteSpace(b))
        {
            return a;
        }
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
        ReadCommentHandling = JsonCommentHandling.Skip
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
            Summary: Summary,
            KeyPoints: KeyPoints,
            Decisions: Decisions,
            ActionItems: (ActionItems).Select(a => a.ToDomain()).ToList(),
            UnresolvedQuestions: UnresolvedQuestions,
            Participants: Participants,
            Topic: Topic,
            ConversationType: ParseConversationType(ConversationType),
            Tags: Tags);
    }

    private sealed class ActionItemDto
    {
        [JsonPropertyName("person")] public string Person { get; init; } = string.Empty;
        [JsonPropertyName("task")] public string Task { get; init; } = string.Empty;
        [JsonPropertyName("deadline")] public string? Deadline { get; init; }

        public ActionItem ToDomain() => new(Person, Task, Deadline);
    }

    private static ConversationType ParseConversationType(string? value) => (value ?? string.Empty).ToLowerInvariant() switch
    {
        "meeting" => ConversationType.Meeting,
        "1:1" or "one_on_one" or "oneonone" => ConversationType.OneOnOne,
        "idea" => ConversationType.Idea,
        "personal" => ConversationType.Personal,
        _ => ConversationType.Other
    };
}
