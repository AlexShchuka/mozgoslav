using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Voice activity detection preprocessor. Drops silence so that Whisper does not
/// hallucinate on empty audio. Implementations either run a real model (Silero)
/// or fall back to energy-based detection when the model is unavailable.
/// </summary>
public interface IVadPreprocessor
{
    /// <summary>
    /// Returns <c>true</c> when the chunk contains speech loud enough to feed into
    /// the STT model, <c>false</c> for silence.
    /// </summary>
    bool ContainsSpeech(AudioChunk chunk);
}
