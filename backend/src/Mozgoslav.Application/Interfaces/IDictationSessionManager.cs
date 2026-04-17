using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// State-machine driver for a single push-to-talk dictation session. The
/// Electron main process drives the lifecycle: start on hotkey press, feed
/// audio chunks while the user holds, stop on release (producing the final
/// text ready for injection) or cancel to abort without injection.
/// </summary>
public interface IDictationSessionManager
{
    /// <summary>Creates and starts a new session; fails if one is already active.</summary>
    /// <param name="source">
    /// TODO-1 — origin tag of the session: <c>"mouse5"</c>, <c>"dashboard"</c>,
    /// <c>"global-hotkey"</c> or <c>null</c> for legacy callers. Stored on the
    /// returned <see cref="DictationSession.Source"/> for observability.
    /// </param>
    DictationSession Start(string? source = null);

    /// <summary>Feeds a chunk of captured PCM audio into the session buffer.</summary>
    ValueTask PushAudioAsync(Guid sessionId, AudioChunk chunk, CancellationToken ct);

    /// <summary>
    /// Subscribes to the partial-transcript stream for a session. The stream
    /// completes when the session is stopped or cancelled.
    /// </summary>
    IAsyncEnumerable<PartialTranscript> SubscribePartialsAsync(Guid sessionId, CancellationToken ct);

    /// <summary>
    /// Finalizes the session: flushes the remaining audio through Whisper,
    /// optionally runs the LLM polish pass, and returns the text that the
    /// client should inject into the focused app.
    /// </summary>
    /// <param name="sessionId">Session identifier returned by <see cref="Start"/>.</param>
    /// <param name="ct">Cancellation token for the finalize pipeline.</param>
    /// <param name="bundleId">
    /// ADR-004 R2: macOS bundle identifier of the focused app at finalize time,
    /// reported by the Swift helper. When set, the session manager consults
    /// <see cref="IPerAppCorrectionProfiles"/> to tweak the polish prompt.
    /// Pass <c>null</c> for generic polish (default behavior).
    /// </param>
    Task<FinalTranscript> StopAsync(Guid sessionId, CancellationToken ct, string? bundleId = null);

    /// <summary>Aborts a session without producing or injecting any text.</summary>
    Task CancelAsync(Guid sessionId, CancellationToken ct);

    /// <summary>Returns the current session snapshot, or <c>null</c> if unknown.</summary>
    DictationSession? TryGet(Guid sessionId);
}
