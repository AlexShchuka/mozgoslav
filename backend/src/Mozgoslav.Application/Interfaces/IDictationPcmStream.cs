using System.Diagnostics.CodeAnalysis;
using System.Threading.Channels;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Per-session streaming decoder that turns an arbitrary encoded audio stream
/// (e.g. Opus-in-WebM shipped by the browser's <c>MediaRecorder</c>) into 16 kHz
/// float32 mono PCM — the shape <see cref="IStreamingTranscriptionService"/>
/// accepts without further conversion.
/// <para>
/// The Dashboard record button splits a recording into many small chunks,
/// only the first of which carries the WebM EBML header. Feeding every chunk
/// through an independent one-shot <c>ffmpeg</c> invocation fails with exit
/// code 183 on every continuation chunk because EBML parsing rejects the
/// header-less body. A long-running process per session — stdin held open
/// while the user records, stdout producing PCM as clusters become decodable
/// — is the fix (D4 in the release queue).
/// </para>
/// <para>
/// Lifecycle per session:
/// <list type="number">
///   <item><see cref="StartAsync"/> spawns <c>ffmpeg</c> and opens the output
///   channel returned by <see cref="GetReader"/>.</item>
///   <item>Each chunk posted from the client is forwarded to
///   <see cref="WriteAsync"/>; the caller consumes decoded samples from
///   <see cref="GetReader"/> in parallel.</item>
///   <item><see cref="StopAsync"/> closes stdin, awaits any remaining stdout
///   samples (bounded by an implementation timeout) and returns them. After
///   <c>StopAsync</c> completes the reader is marked completed.</item>
/// </list>
/// </para>
/// </summary>
[SuppressMessage("Naming", "CA1711:Identifiers should not have incorrect suffix",
    Justification = "D4 — the type IS a per-session stream of decoded PCM; the 'Stream' suffix is intentional.")]
public interface IDictationPcmStream
{
    /// <summary>Target sample rate every emitted PCM buffer is produced at.</summary>
    int TargetSampleRate { get; }

    /// <summary>Starts a new per-session decoder. Throws if the session id is already active.</summary>
    Task StartAsync(Guid sessionId, CancellationToken ct);

    /// <summary>Writes an encoded payload chunk to the session's ffmpeg stdin.</summary>
    Task WriteAsync(Guid sessionId, byte[] chunk, CancellationToken ct);

    /// <summary>
    /// Closes stdin for the session, waits for <c>ffmpeg</c> to drain any buffered
    /// PCM (with an implementation timeout), and returns whatever samples were
    /// still in-flight when the caller asked to stop. The returned buffer may be
    /// empty on clean exit because all PCM has already flowed through
    /// <see cref="GetReader"/>.
    /// </summary>
    Task<float[]> StopAsync(Guid sessionId, CancellationToken ct);

    /// <summary>
    /// Returns the PCM reader owned by the session. The channel is marked
    /// completed after <see cref="StopAsync"/> returns or when the session is
    /// cancelled via <see cref="CancelAsync"/>. Throws when the session is not
    /// known (caller order bug).
    /// </summary>
    ChannelReader<float[]> GetReader(Guid sessionId);

    /// <summary>
    /// Aborts a session without waiting for a graceful drain — kills the
    /// underlying <c>ffmpeg</c> process, discards any in-flight PCM and marks
    /// the reader channel completed. Idempotent: unknown session ids are a no-op.
    /// </summary>
    Task CancelAsync(Guid sessionId, CancellationToken ct);
}
