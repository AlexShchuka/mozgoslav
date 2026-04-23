using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record RestApiCheck(
    bool Ok,
    bool Required,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? Host,
    string? Version);
