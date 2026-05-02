using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Models;

public sealed record CancelModelDownloadPayload(bool Ok, IReadOnlyList<IUserError> Errors);
