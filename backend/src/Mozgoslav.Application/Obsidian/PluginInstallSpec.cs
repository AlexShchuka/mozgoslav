using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.8 — descriptor for a single pinned Obsidian plugin. Matches
/// <c>Resources/ObsidianBootstrap/pinned-plugins.json</c> entries 1:1.
/// </summary>
public sealed record PluginInstallSpec(
    string Id,
    string Owner,
    string Repo,
    string Tag,
    IReadOnlyList<PluginAssetSpec> Assets);

/// <summary>ADR-019 §5.8 — one asset inside a <see cref="PluginInstallSpec"/>.</summary>
public sealed record PluginAssetSpec(
    string Name,
    string Sha256,
    string Dest,
    bool Optional = false);
