using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.3 — vault-path reachability + .obsidian presence.</summary>
public sealed record VaultPathCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string VaultPath);
