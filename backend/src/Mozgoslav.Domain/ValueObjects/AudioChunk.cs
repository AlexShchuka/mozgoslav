using System;

namespace Mozgoslav.Domain.ValueObjects;

/// accepts without further conversion.
public sealed record AudioChunk(float[] Samples, int SampleRate, TimeSpan Offset);
