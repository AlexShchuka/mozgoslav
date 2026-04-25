using System;
using System.Collections.Concurrent;
using System.Threading.Channels;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class ChannelRecordingPartialsNotifier : IRecordingPartialsNotifier, IDisposable
{
    private const int ChannelCapacity = 256;

    private readonly ConcurrentDictionary<Guid, Channel<RecordingPartialPayload>> _channels = new();

    public ChannelReader<RecordingPartialPayload> SubscribeFor(Guid recordingId)
    {
        var channel = _channels.GetOrAdd(recordingId, static _ => Channel.CreateBounded<RecordingPartialPayload>(
            new BoundedChannelOptions(ChannelCapacity)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = false,
                SingleWriter = false,
            }));
        return channel.Reader;
    }

    public void Publish(RecordingPartialPayload payload)
    {
        ArgumentNullException.ThrowIfNull(payload);
        if (!_channels.TryGetValue(payload.RecordingId, out var channel))
        {
            return;
        }
        channel.Writer.TryWrite(payload);
    }

    public void Dispose()
    {
        foreach (var channel in _channels.Values)
        {
            channel.Writer.TryComplete();
        }
        _channels.Clear();
    }
}
