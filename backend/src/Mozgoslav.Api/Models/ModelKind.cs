namespace Mozgoslav.Api.Models;

public enum ModelKind
{
    Stt,
    Vad,
    Llm,
    /// <summary>
    /// Audio-domain ML model served by the python sidecar — gender,
    /// emotion, diarization. ADR-010 §2.3 classifies these as Tier-2
    /// downloads.
    /// </summary>
    AudioMl,
    /// <summary>
    /// Natural-language-domain ML model. NER lives here; future spaCy /
    /// Stanza models would too.
    /// </summary>
    NlpMl
}
