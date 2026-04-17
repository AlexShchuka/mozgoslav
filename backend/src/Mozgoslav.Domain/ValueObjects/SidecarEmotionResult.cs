namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// Emotion classification response from <c>POST /api/emotion</c>.
/// The three dimensions are each in <c>[-1, 1]</c>; <see cref="Emotion"/>
/// is a discrete label derived from <see cref="Arousal"/> /
/// <see cref="Valence"/> (Russell's circumplex).
/// </summary>
public sealed record SidecarEmotionResult(
    string Emotion,
    double Valence,
    double Arousal,
    double Dominance);
