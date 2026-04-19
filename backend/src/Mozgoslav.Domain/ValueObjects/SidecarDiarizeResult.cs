using System.Collections.Generic;

namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// One diarized speaker segment — maps 1:1 to the python sidecar's
/// <c>SpeakerSegment</c> schema.
/// </summary>
public sealed record SidecarSpeakerSegment(
    string Speaker,
    double Start,
    double End);

/// <summary>
/// Full diarization response from <c>POST /api/diarize</c>. Segments
/// are ordered by start time; <see cref="NumSpeakers"/> is the number
/// of distinct cluster labels.
/// </summary>
public sealed record SidecarDiarizeResult(
    IReadOnlyList<SidecarSpeakerSegment> Segments,
    int NumSpeakers);
