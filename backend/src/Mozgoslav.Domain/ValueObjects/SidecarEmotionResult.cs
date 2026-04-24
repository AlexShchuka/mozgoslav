namespace Mozgoslav.Domain.ValueObjects;

public sealed record SidecarEmotionResult(
    string Emotion,
    double Valence,
    double Arousal,
    double Dominance);
