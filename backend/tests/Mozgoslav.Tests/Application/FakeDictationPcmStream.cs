using System.Collections.Concurrent;
using System.Threading.Channels;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// Test double for <see cref="IDictationPcmStream"/>. Pretends to be a
/// long-running ffmpeg decoder: each input byte becomes one synthetic PCM
/// sample (value = byte / 255) so the session manager can forward something
/// measurable to the transcription service without anyone needing the
/// <c>ffmpeg</c> binary on PATH.
/// </summary>
#pragma warning disable CA1711 // Test double mirrors the production interface name.
public sealed class FakeDictationPcmStream : IDictationPcmStream
#pragma warning restore CA1711
{
    private readonly ConcurrentDictionary<Guid, Channel<float[]>> _channels = new();
    private readonly ConcurrentDictionary<Guid, int> _writesByteCount = new();

    public int TargetSampleRate => 16_000;

    public ConcurrentBag<Guid> StartedSessions { get; } = [];
    public ConcurrentBag<Guid> StoppedSessions { get; } = [];
    public ConcurrentBag<Guid> CancelledSessions { get; } = [];

    public Task StartAsync(Guid sessionId, CancellationToken ct)
    {
        var channel = Channel.CreateUnbounded<float[]>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = true
        });
        if (!_channels.TryAdd(sessionId, channel))
        {
            throw new InvalidOperationException($"Session {sessionId} already started.");
        }
        StartedSessions.Add(sessionId);
        return Task.CompletedTask;
    }

    public async Task WriteAsync(Guid sessionId, byte[] chunk, CancellationToken ct)
    {
        if (!_channels.TryGetValue(sessionId, out var channel))
        {
            throw new KeyNotFoundException($"Session {sessionId} not started.");
        }
        _writesByteCount.AddOrUpdate(sessionId, chunk.Length, (_, prev) => prev + chunk.Length);

        var samples = new float[chunk.Length];
        for (var i = 0; i < chunk.Length; i++)
        {
            samples[i] = chunk[i] / 255.0f;
        }
        await channel.Writer.WriteAsync(samples, ct).ConfigureAwait(false);
    }

    public Task<float[]> StopAsync(Guid sessionId, CancellationToken ct)
    {
        StoppedSessions.Add(sessionId);
        if (_channels.TryRemove(sessionId, out var channel))
        {
            channel.Writer.TryComplete();
        }
        return Task.FromResult(Array.Empty<float>());
    }

    public ChannelReader<float[]> GetReader(Guid sessionId)
    {
        if (!_channels.TryGetValue(sessionId, out var channel))
        {
            throw new KeyNotFoundException($"Session {sessionId} not started.");
        }
        return channel.Reader;
    }

    public Task CancelAsync(Guid sessionId, CancellationToken ct)
    {
        CancelledSessions.Add(sessionId);
        if (_channels.TryRemove(sessionId, out var channel))
        {
            channel.Writer.TryComplete();
        }
        return Task.CompletedTask;
    }
}
