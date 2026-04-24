using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record PluginInstallSpec(
    string Id,
    string Owner,
    string Repo,
    string Tag,
    IReadOnlyList<PluginAssetSpec> Assets);

public sealed record PluginAssetSpec(
    string Name,
    string Sha256,
    string Dest,
    bool Optional = false);
