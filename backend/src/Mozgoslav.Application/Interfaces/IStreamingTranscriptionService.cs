using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Dictation-side transcription: consumes either a live chunk stream (preview
/// partials while the user holds the hotkey) or the whole per-session sample
/// buffer on release (one-shot authoritative result that gets injected).
/// Industry-standard push-to-talk tools (Superwhisper, MacWhisper, Voxtype,
/// Whisper Notes) use the one-shot path for the final text because a single
/// whisper pass with the full beam and full 30 s attention window is both
/// faster and more accurate than greedy sliding windows for sub-minute speech.
/// </summary>
public interface IStreamingTranscriptionService
{
    IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
        IAsyncEnumerable<AudioChunk> chunks,
        string language,
        string? initialPrompt,
        CancellationToken ct);

    Task<string> TranscribeSamplesAsync(
        float[] samples,
        string language,
        string? initialPrompt,
        CancellationToken ct);
}
