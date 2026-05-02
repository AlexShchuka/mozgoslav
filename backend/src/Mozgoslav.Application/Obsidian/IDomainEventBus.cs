using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public interface IDomainEventBus
{
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : class;

    IAsyncEnumerable<TEvent> SubscribeAsync<TEvent>(CancellationToken ct)
        where TEvent : class;

    Task WaitForSubscriberAsync<TEvent>(CancellationToken ct)
        where TEvent : class;
}
