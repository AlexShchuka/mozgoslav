using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix",
    Justification = "D4 — the type IS a per-session stream of decoded PCM; the 'Stream' suffix is intentional.")]
public interface IDictationPcmStream
{
    int TargetSampleRate { get; }

    Task StartAsync(Guid sessionId, CancellationToken ct);

    Task WriteAsync(Guid sessionId, byte[] chunk, CancellationToken ct);

    Task<float[]> StopAsync(Guid sessionId, CancellationToken ct);

    ChannelReader<float[]> GetReader(Guid sessionId);

    Task CancelAsync(Guid sessionId, CancellationToken ct);
}
