using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

public interface IVadPreprocessor
{
    bool ContainsSpeech(AudioChunk chunk);
}
