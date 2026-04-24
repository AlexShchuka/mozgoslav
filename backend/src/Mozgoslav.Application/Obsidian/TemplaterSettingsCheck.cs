using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record TemplaterSettingsCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? TemplatesFolder,
    string? UserScriptsFolder);
