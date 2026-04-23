namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.3 — severity of a single diagnostic check. <see cref="Advisory"/>
/// checks (e.g., LM Studio) never gate the wizard's success contract.
/// </summary>
public enum CheckSeverity
{
    Ok,
    Advisory,
    Warning,
    Error,
}
