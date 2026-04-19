using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// NEXT H1 — in-process fan-out for global hotkey press/release events.
/// Mirrors <see cref="ChannelAudioDeviceChangeNotifier"/> down to the
/// lifecycle semantics: every subscriber gets its own unbounded channel;
/// every publish writes to all current subscribers.
/// </summary>
public sealed class ChannelHotkeyEventNotifier : IHotkeyEventNotifier, IDisposable
{
    private readonly ConcurrentDictionary<Guid, Channel<HotkeyEvent>> _subscribers = new();

    public async ValueTask PublishAsync(HotkeyEvent payload, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(payload);
        foreach (var channel in _subscribers.Values)
        {
            await channel.Writer.WriteAsync(payload, ct);
        }
    }

    public async IAsyncEnumerable<HotkeyEvent> SubscribeAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<HotkeyEvent>(new UnboundedChannelOptions
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
