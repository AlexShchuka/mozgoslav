using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.3 — single plugin install + enable + hash status.</summary>
public sealed record PluginCheck(
    string PluginId,
    bool Installed,
    bool Enabled,
    bool HashMatches,
    bool Optional,
    string ExpectedVersion,
    string? InstalledVersion,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions)
{
    public bool Ok => Installed && Enabled && HashMatches;
}
