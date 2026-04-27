using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Obsidian;

public sealed record ObsidianReinstallPluginsPayload(
    IReadOnlyList<string> Reinstalled,
    IReadOnlyList<IUserError> Errors);
