using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Obsidian;

public sealed record ObsidianDetectionResult(
    IReadOnlyList<ObsidianVaultEntry> Detected,
    IReadOnlyList<string> Searched);

public sealed record ObsidianVaultEntry(string Path, string Name);
