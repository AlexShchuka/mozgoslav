using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationStopPayload(
    string? RawText,
    string? PolishedText,
    double? DurationMs,
    IReadOnlyList<IUserError> Errors);
