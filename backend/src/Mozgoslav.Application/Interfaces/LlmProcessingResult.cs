using System.Collections.Generic;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

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
