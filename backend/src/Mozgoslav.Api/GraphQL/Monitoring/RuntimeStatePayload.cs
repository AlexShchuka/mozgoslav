using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

public sealed record RuntimeStatePayload(RuntimeState? State, IReadOnlyList<IUserError> Errors);
