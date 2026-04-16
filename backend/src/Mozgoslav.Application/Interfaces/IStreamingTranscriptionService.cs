using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Streaming counterpart to <see cref="ITranscriptionService"/>: consumes a live
/// sequence of 16 kHz PCM audio chunks and emits partial transcripts as the
/// model catches up. Used by the push-to-talk dictation pipeline where the user
/// holds a hotkey and expects live feedback in the overlay.
/// </summary>
public interface IStreamingTranscriptionService
{
    IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
        IAsyncEnumerable<AudioChunk> chunks,
        string language,
        string? initialPrompt,
        CancellationToken ct);
}
