using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record BootstrapDriftCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    IReadOnlyList<BootstrapFileDrift> Files);

public sealed record BootstrapFileDrift(
    string VaultRelativePath,
    BootstrapDriftStatus Status,
    string ExpectedSha256,
    string? ActualSha256);

public enum BootstrapDriftStatus
{
    Ok,
    Missing,
    Outdated,
    UserModified,
    Extra,
}
