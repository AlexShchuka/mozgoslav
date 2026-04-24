using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed record RecordingPayload(Recording? Recording, IReadOnlyList<IUserError> Errors);
