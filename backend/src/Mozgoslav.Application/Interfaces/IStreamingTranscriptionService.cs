using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

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
