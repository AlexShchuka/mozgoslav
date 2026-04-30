using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;
using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class MonitoringSubscriptionType
{
    public async ValueTask<ISourceStream<RuntimeState>> SubscribeToRuntimeStateChanged(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<RuntimeState>(MonitoringTopics.RuntimeStateChanged, ct);
    }

    [Subscribe(With = nameof(SubscribeToRuntimeStateChanged))]
    public RuntimeState RuntimeStateChanged([EventMessage] RuntimeState state) => state;
}
