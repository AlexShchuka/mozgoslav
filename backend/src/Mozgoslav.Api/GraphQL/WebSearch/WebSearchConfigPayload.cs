using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.WebSearch;

public sealed record WebSearchConfigPayload(
    WebSearchConfigDto? Config,
    IReadOnlyList<IUserError> Errors);
