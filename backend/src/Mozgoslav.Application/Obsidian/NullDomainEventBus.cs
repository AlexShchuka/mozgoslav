using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.5 — default subscriber-less bus. Publish completes synchronously
/// and drops the event. Registered as the fallback so the main pipeline
/// never waits for an absent sidecar.
/// </summary>
public sealed class NullDomainEventBus : IDomainEventBus
{
    public Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : class => Task.CompletedTask;
}
