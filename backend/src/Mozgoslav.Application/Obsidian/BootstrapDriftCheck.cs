using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.9 — per-file drift classification for the embedded bootstrap.</summary>
public sealed record BootstrapDriftCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    IReadOnlyList<BootstrapFileDrift> Files);

/// <summary>Per-file drift status for a single shipped bootstrap entry.</summary>
public sealed record BootstrapFileDrift(
    string VaultRelativePath,
    BootstrapDriftStatus Status,
    string ExpectedSha256,
    string? ActualSha256);

/// <summary>ADR-019 §5.9 — drift states for a single bootstrap entry.</summary>
public enum BootstrapDriftStatus
{
    Ok,
    Missing,
    Outdated,
    UserModified,
    Extra,
}
