using System;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationPartialEvent(
    Guid SessionId,
    string Text,
    double TimestampMs);
