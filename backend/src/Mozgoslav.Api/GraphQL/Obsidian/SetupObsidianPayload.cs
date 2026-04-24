using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Obsidian;

public sealed record SetupObsidianPayload(
    ObsidianSetupReport? Report,
    IReadOnlyList<IUserError> Errors);

public sealed record ObsidianSetupReport(
    string VaultPath,
    IReadOnlyList<string> CreatedPaths,
    IReadOnlyList<string> SkippedPaths);
