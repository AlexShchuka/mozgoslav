using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

public interface IDictationSessionManager
{
    DictationSession Start(string? source = null, DictationSessionKind kind = DictationSessionKind.Dictation, Guid? recordingId = null);

    ValueTask PushAudioAsync(Guid sessionId, AudioChunk chunk, CancellationToken ct);

    Task PushRawChunkAsync(Guid sessionId, byte[] encodedChunk, CancellationToken ct);

    IAsyncEnumerable<PartialTranscript> SubscribePartialsAsync(Guid sessionId, CancellationToken ct);

    Task<FinalTranscript> StopAsync(Guid sessionId, CancellationToken ct, string? bundleId = null);

    Task CancelAsync(Guid sessionId, CancellationToken ct);

    DictationSession? TryGet(Guid sessionId);
}
