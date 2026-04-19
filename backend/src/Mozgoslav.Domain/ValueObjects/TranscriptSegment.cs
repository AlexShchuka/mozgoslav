using System;

namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// One slice of a Whisper transcript. <see cref="CheckpointAt"/> (ADR-007
/// §2.8 / BC-017) is written by the long-running transcription loop every
/// ~5 minutes of wall-clock time so a crash/restart can resume from the last
/// known-good boundary instead of re-running from 0.
/// <para>
/// T3 — <see cref="SpeakerLabel"/> is populated by the diarization pipeline
/// (Python sidecar) when multiple speakers are detected in the same
/// recording. <c>null</c> means "unknown speaker" (single-speaker recording
/// or diarization disabled) and must render identical to pre-T3 output.
/// </para>
/// </summary>
public sealed record TranscriptSegment(
    TimeSpan Start,
    TimeSpan End,
    string Text,
    DateTime? CheckpointAt = null,
    string? SpeakerLabel = null);
