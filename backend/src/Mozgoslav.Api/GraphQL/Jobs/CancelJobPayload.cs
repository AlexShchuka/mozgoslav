using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed record CancelJobPayload(IReadOnlyList<IUserError> Errors);
