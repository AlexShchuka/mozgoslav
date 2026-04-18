using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// D3 — in-process fan-out notifier for audio-device hot-plug events. Mirrors
/// <see cref="ChannelJobProgressNotifier"/>: every subscriber gets its own
/// unbounded channel; every publish writes to all current subscribers.
/// </summary>
public sealed class ChannelAudioDeviceChangeNotifier : IAudioDeviceChangeNotifier, IDisposable
{
    private readonly ConcurrentDictionary<Guid, Channel<AudioDeviceChangePayload>> _subscribers = new();

    public async ValueTask PublishAsync(AudioDeviceChangePayload payload, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(payload);
        foreach (var channel in _subscribers.Values)
        {
            await channel.Writer.WriteAsync(payload, ct);
        }
    }

    public async IAsyncEnumerable<AudioDeviceChangePayload> SubscribeAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<AudioDeviceChangePayload>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        _subscribers[id] = channel;
        try
        {
            await foreach (var evt in channel.Reader.ReadAllAsync(ct))
            {
                yield return evt;
            }
        }
        finally
        {
            _subscribers.TryRemove(id, out _);
            channel.Writer.TryComplete();
        }
    }

    public void Dispose()
    {
        foreach (var channel in _subscribers.Values)
        {
            channel.Writer.TryComplete();
        }
        _subscribers.Clear();
    }
}
