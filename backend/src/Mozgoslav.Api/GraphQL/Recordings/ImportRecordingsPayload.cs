using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed record ImportRecordingsPayload(IReadOnlyList<Recording> Recordings, IReadOnlyList<IUserError> Errors);
