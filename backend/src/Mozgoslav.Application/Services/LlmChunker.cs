using System.Text.Json;
using System.Text.Json.Serialization;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Services;

/// <summary>
/// ADR-006 D-14: shared chunk/merge/parse helper extracted from the
/// OpenAI-specific service so every <see cref="ILlmProvider"/> can reuse it.
/// Stateless — every method is a pure transformation over transcript text
/// or provider output.
/// </summary>
public static class LlmChunker
{
    public const int DefaultMaxChars = 24_000;

    /// <summary>Splits transcript into <see cref="DefaultMaxChars"/>-sized chunks (inclusive).</summary>
    public static IEnumerable<string> Chunk(string text, int maxChars = DefaultMaxChars)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            yield break;
        }
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

    /// <summary>Associative merge used to reduce per-chunk results into one.</summary>
    public static LlmProcessingResult Merge(LlmProcessingResult a, LlmProcessingResult b) => new(
        Summary: CombineSummary(a.Summary, b.Summary),
        KeyPoints: Combine(a.KeyPoints, b.KeyPoints),
        Decisions: Combine(a.Decisions, b.Decisions),
        ActionItems: Combine(a.ActionItems, b.ActionItems),
        UnresolvedQuestions: Combine(a.UnresolvedQuestions, b.UnresolvedQuestions),
        Participants: Combine(a.Participants, b.Participants),
        Topic: string.IsNullOrWhiteSpace(a.Topic) ? b.Topic : a.Topic,
        ConversationType: a.ConversationType == ConversationType.Other ? b.ConversationType : a.ConversationType,
        Tags: Combine(a.Tags, b.Tags));

    /// <summary>Parses JSON-ish provider output; falls back to treating the whole body as a Summary.</summary>
    public static LlmProcessingResult ParseOrRepair(string rawContent)
    {
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            return Empty;
        }
        var json = ExtractJson(rawContent);
        try
        {
            var dto = JsonSerializer.Deserialize<LlmJsonDto>(json, JsonOptions)
                ?? throw new JsonException("Empty deserialization");
            return dto.ToDomain();
        }
        catch (JsonException)
        {
            return Empty with { Summary = rawContent.Trim() };
        }
    }

    public static LlmProcessingResult Empty { get; } = new(
        Summary: string.Empty,
        KeyPoints: [],
        Decisions: [],
        ActionItems: [],
        UnresolvedQuestions: [],
        Participants: [],
        Topic: string.Empty,
        ConversationType: ConversationType.Other,
        Tags: []);

    private static string CombineSummary(string a, string b) =>
        string.IsNullOrWhiteSpace(a) ? b : string.IsNullOrWhiteSpace(b) ? a : $"{a}\n\n{b}";

    private static IReadOnlyList<T> Combine<T>(IReadOnlyList<T> a, IReadOnlyList<T> b) =>
        a.Concat(b).Distinct().ToList();

    private static string ExtractJson(string content)
    {
        var start = content.IndexOf('{', StringComparison.Ordinal);
        var end = content.LastIndexOf('}');
        return start >= 0 && end > start ? content.Substring(start, end - start + 1) : content;
    }

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
            Summary: Summary,
            KeyPoints: KeyPoints,
            Decisions: Decisions,
            ActionItems: ActionItems.Select(a => a.ToDomain()).ToList(),
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
        _ => ConversationType.Other,
    };
}
