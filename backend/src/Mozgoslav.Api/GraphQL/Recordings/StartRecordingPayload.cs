using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed record StartRecordingPayload(string? SessionId, string? OutputPath, IReadOnlyList<IUserError> Errors);
