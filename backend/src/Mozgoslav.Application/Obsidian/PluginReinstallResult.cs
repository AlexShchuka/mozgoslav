using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record PluginReinstallResult(
    IReadOnlyList<string> Reinstalled);
