using System.Collections.Generic;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Structured LLM output after a transcript is processed through a profile.
/// Every collection is read-only — downstream consumers do not mutate the result.
/// </summary>
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
