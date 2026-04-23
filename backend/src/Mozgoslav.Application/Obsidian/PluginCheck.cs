using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

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
