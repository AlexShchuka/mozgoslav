using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.3 — Templater plugin settings shape vs. expected preset.</summary>
public sealed record TemplaterSettingsCheck(
    bool Ok,
    CheckSeverity Severity,
    string Code,
    string Message,
    IReadOnlyList<DiagnosticAction> Actions,
    string? TemplatesFolder,
    string? UserScriptsFolder);
