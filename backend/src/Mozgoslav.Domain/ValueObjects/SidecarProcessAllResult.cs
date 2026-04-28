using System.Collections.Generic;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record SidecarProcessAllResult(
    SidecarDiarizeResult Diarize,
    SidecarGenderResult Gender,
    SidecarEmotionResult Emotion,
    SidecarNerResult Ner,
    string CleanedText,
    IReadOnlyList<float> Embedding);
