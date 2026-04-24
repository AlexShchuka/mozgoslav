using System;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationSessionStatus(
    Guid SessionId,
    string State,
    string? Source,
    DateTime StartedAt);
