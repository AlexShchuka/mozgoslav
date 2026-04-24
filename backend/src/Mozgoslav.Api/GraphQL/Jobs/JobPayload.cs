using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed record JobPayload(ProcessingJob? Job, IReadOnlyList<IUserError> Errors);
