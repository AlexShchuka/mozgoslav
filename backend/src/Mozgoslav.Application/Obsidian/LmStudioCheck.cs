using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.3 — LM Studio reachability. Advisory — never gates success.</summary>
public sealed record LmStudioCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? Endpoint);
