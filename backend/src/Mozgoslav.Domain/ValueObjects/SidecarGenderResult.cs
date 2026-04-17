namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// Gender classification response from <c>POST /api/gender</c>.
/// <see cref="Gender"/> is one of <c>"male"</c>, <c>"female"</c>,
/// <c>"unknown"</c>.
/// </summary>
public sealed record SidecarGenderResult(
    string Gender,
    double Confidence);
