using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record LmStudioCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? Endpoint);
