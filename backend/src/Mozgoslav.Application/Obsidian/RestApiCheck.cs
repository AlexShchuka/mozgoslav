using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.3 — Local REST API plugin reachability + token match.</summary>
public sealed record RestApiCheck(
    bool Ok,
    bool Required,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? Host,
    string? Version);
