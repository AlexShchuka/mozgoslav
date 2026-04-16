using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

public interface ILlmService
{
    Task<LlmProcessingResult> ProcessAsync(
        string transcript,
        string systemPrompt,
        CancellationToken ct);

    Task<bool> IsAvailableAsync(CancellationToken ct);
}

public sealed record LlmProcessingResult(
    string Summary,
    IReadOnlyList<string> KeyPoints,
    IReadOnlyList<string> Decisions,
    IReadOnlyList<ActionItem> ActionItems,
    IReadOnlyList<string> UnresolvedQuestions,
    IReadOnlyList<string> Participants,
    string Topic,
    ConversationType ConversationType,
    IReadOnlyList<string> Tags);
