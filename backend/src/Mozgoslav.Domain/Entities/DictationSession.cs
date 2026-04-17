using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

/// <summary>
/// Snapshot of a single push-to-talk dictation session. Sessions are short-lived
/// (seconds to a few minutes) and live in-memory only; there is no persistence —
/// finalized text is handed back to the Electron client which injects it into
/// the focused app and the session is forgotten.
/// </summary>
public sealed class DictationSession
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DictationState State { get; set; } = DictationState.Recording;
    public DateTime StartedAt { get; init; } = DateTime.UtcNow;
    public DateTime? FinishedAt { get; set; }

    /// <summary>
    /// TODO-1 — origin of the session: "mouse5" (Electron mouse-button hotkey),
    /// "dashboard" (in-app record button), "global-hotkey" (system-wide shortcut).
    /// <c>null</c> for legacy callers that do not declare a source.
    /// </summary>
    public string? Source { get; init; }
}
