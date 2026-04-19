using System;

namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// A single chunk of PCM audio handed to the streaming transcription pipeline.
/// Samples are 16-bit signed mono at <see cref="SampleRate"/> Hz, exposed as a
/// <see cref="float"/> array in the range [-1.0, 1.0] — the format Whisper.net
/// accepts without further conversion.
/// </summary>
public sealed record AudioChunk(float[] Samples, int SampleRate, TimeSpan Offset);
