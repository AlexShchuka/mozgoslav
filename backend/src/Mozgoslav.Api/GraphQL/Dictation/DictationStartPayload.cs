using System;
using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationStartPayload(
    Guid? SessionId,
    string? Source,
    IReadOnlyList<IUserError> Errors);
