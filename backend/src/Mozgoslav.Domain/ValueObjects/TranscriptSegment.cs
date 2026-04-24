using System;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record TranscriptSegment(
    TimeSpan Start,
    TimeSpan End,
    string Text,
    DateTime? CheckpointAt = null,
    string? SpeakerLabel = null);
