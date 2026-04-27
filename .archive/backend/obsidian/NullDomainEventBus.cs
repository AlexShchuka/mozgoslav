using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public sealed class NullDomainEventBus : IDomainEventBus
{
    public Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : class => Task.CompletedTask;
}
