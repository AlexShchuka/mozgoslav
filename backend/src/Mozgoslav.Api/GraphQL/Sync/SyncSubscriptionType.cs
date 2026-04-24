using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;

namespace Mozgoslav.Api.GraphQL.Sync;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class SyncSubscriptionType
{
    public async ValueTask<ISourceStream<SyncEventMessage>> SubscribeToSyncEvents(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<SyncEventMessage>(SyncTopics.AllEvents, ct);
    }

    [Subscribe(With = nameof(SubscribeToSyncEvents))]
    public SyncEventMessage SyncEvents([EventMessage] SyncEventMessage message) => message;
}
