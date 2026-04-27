using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record BootstrapReapplyResult(
    IReadOnlyList<string> Overwritten,
    IReadOnlyList<string> Skipped,
    string? BackedUpTo);
