using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class ModelSubscriptionType
{
    public async ValueTask<ISourceStream<ModelDownloadProgressEvent>> SubscribeToModelDownloadProgress(
        string downloadId,
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        var topic = ModelDownloadTopics.ForDownloadId(downloadId);
        return await receiver.SubscribeAsync<ModelDownloadProgressEvent>(topic, ct);
    }

    [Subscribe(With = nameof(SubscribeToModelDownloadProgress))]
    public ModelDownloadProgressEvent ModelDownloadProgress(
        [EventMessage] ModelDownloadProgressEvent message)
        => message;
}
