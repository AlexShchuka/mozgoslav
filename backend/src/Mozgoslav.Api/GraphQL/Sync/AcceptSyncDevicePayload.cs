using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Sync;

public sealed record AcceptSyncDevicePayload(bool Accepted, IReadOnlyList<IUserError> Errors);
