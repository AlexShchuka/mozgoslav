using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Profiles;

public sealed record ProfilePayload(Profile? Profile, IReadOnlyList<IUserError> Errors);
