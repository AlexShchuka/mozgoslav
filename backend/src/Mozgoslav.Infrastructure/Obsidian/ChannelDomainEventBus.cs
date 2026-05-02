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
    private readonly ConcurrentDictionary<Type, TaskCompletionSource> _readiness = new();

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
        if (_readiness.TryGetValue(typeof(TEvent), out var tcs))
        {
            tcs.TrySetResult();
        }
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

    public Task WaitForSubscriberAsync<TEvent>(CancellationToken ct)
        where TEvent : class
    {
        if (_subscribers.TryGetValue(typeof(TEvent), out var existing) && !existing.IsEmpty)
        {
            return Task.CompletedTask;
        }
        var tcs = _readiness.GetOrAdd(
            typeof(TEvent),
            _ => new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously));
        ct.Register(() => tcs.TrySetCanceled(ct));
        return tcs.Task;
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
