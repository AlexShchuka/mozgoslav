using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Obsidian;

public sealed record ObsidianReapplyBootstrapPayload(
    IReadOnlyList<string> Overwritten,
    IReadOnlyList<string> Skipped,
    string? BackedUpTo,
    IReadOnlyList<IUserError> Errors);
