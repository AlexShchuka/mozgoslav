using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record VaultPathCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string VaultPath);
