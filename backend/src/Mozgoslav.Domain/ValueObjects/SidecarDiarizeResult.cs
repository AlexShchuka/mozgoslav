using System.Collections.Generic;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record SidecarSpeakerSegment(
    string Speaker,
    double Start,
    double End);

public sealed record SidecarDiarizeResult(
    IReadOnlyList<SidecarSpeakerSegment> Segments,
    int NumSpeakers);
