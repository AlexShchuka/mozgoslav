using System;
using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed record StartRecordingPayload(
    string? SessionId,
    Guid? RecordingId,
    Guid? DictationSessionId,
    string? OutputPath,
    IReadOnlyList<IUserError> Errors);
