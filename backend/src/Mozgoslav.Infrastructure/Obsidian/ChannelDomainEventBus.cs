using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public sealed class ChannelDomainEventBus : IDomainEventBus, IDisposable
{
    private readonly ConcurrentDictionary<Type, ConcurrentDictionary<Guid, Channel<object>>> _subscribers = new();

    public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : class
    {
        ArgumentNullException.ThrowIfNull(domainEvent);
        if (!_subscribers.TryGetValue(typeof(TEvent), out var byType))
        {
            return;
        }
        foreach (var channel in byType.Values)
        {
            await channel.Writer.WriteAsync(domainEvent, ct);
        }
    }

    public async IAsyncEnumerable<TEvent> SubscribeAsync<TEvent>(
        [EnumeratorCancellation] CancellationToken ct)
        where TEvent : class
    {
        var byType = _subscribers.GetOrAdd(typeof(TEvent), _ => new ConcurrentDictionary<Guid, Channel<object>>());
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<object>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        byType[id] = channel;
        try
        {
            while (true)
            {
                object item;
                try
                {
                    item = await channel.Reader.ReadAsync(ct);
                }
                catch (OperationCanceledException)
                {
                    yield break;
                }
                catch (ChannelClosedException)
                {
                    yield break;
                }
                yield return (TEvent)item;
            }
        }
        finally
        {
            byType.TryRemove(id, out _);
            channel.Writer.TryComplete();
        }
    }

    public void Dispose()
    {
        foreach (var byType in _subscribers.Values)
        {
            foreach (var channel in byType.Values)
            {
                channel.Writer.TryComplete();
            }
            byType.Clear();
        }
        _subscribers.Clear();
    }
}
