namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// Incremental transcription result emitted while dictation is still active.
/// <see cref="Text"/> contains the whole transcript accumulated so far; the UI
/// replaces the overlay's current text on every update rather than appending.
/// </summary>
public sealed record PartialTranscript(string Text, TimeSpan Timestamp);
