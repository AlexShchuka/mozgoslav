namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Decodes an encoded audio payload (e.g. Opus-in-WebM produced by the
/// browser <c>MediaRecorder</c>) into raw 16 kHz mono float32 PCM samples
/// — the shape that <see cref="IStreamingTranscriptionService"/> accepts
/// without further conversion.
/// <para>
/// Implementations are free to shell out to <c>ffmpeg</c> or use any other
/// decoder; the cost is acceptable on dev-box dictation (ADR-004 notes this
/// is not a production-hot-path).
/// </para>
/// </summary>
public interface IAudioPcmDecoder
{
    /// <summary>Target sample rate every decoded buffer normalises to.</summary>
    int TargetSampleRate { get; }

    /// <summary>
    /// Returns the decoded float32 mono samples at <see cref="TargetSampleRate"/> Hz.
    /// </summary>
    /// <param name="encodedPayload">Raw encoded audio (e.g. WebM/Opus bytes).</param>
    /// <param name="ct">Cancellation token.</param>
    Task<float[]> DecodeToPcmAsync(byte[] encodedPayload, CancellationToken ct);
}
