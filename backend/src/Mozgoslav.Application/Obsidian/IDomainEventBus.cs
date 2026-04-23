using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.5 — in-process domain event bus. Publishers do not know who
/// subscribes; subscribers run in their own background workers. The
/// default-registered <c>NullDomainEventBus</c> drops every event, so the
/// main pipeline is safe when the Obsidian feature is off or unconfigured.
/// </summary>
public interface IDomainEventBus
{
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken ct)
        where TEvent : class;
}
