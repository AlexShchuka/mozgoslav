using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class JobSubscriptionType
{
    public async ValueTask<ISourceStream<ProcessingJob>> SubscribeToJobProgress(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<ProcessingJob>(JobProgressTopics.AllJobs, ct);
    }

    [Subscribe(With = nameof(SubscribeToJobProgress))]
    public ProcessingJob JobProgress([EventMessage] ProcessingJob message) => message;
}
