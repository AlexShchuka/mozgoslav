using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class ModelSubscriptionType
{
    public ISourceStream<ModelDownloadProgressEvent> SubscribeToModelDownloadProgress(
        string downloadId,
        [Service] IModelDownloadCoordinator coordinator,
        CancellationToken ct)
    {
        return new CoordinatorSourceStream(coordinator, downloadId, ct);
    }

    [Subscribe(With = nameof(SubscribeToModelDownloadProgress))]
    public ModelDownloadProgressEvent ModelDownloadProgress(
        [EventMessage] ModelDownloadProgressEvent message)
        => message;

    private sealed class CoordinatorSourceStream : ISourceStream<ModelDownloadProgressEvent>
    {
        private readonly IModelDownloadCoordinator _coordinator;
        private readonly string _downloadId;
        private readonly CancellationToken _ct;

        public CoordinatorSourceStream(
            IModelDownloadCoordinator coordinator,
            string downloadId,
            CancellationToken ct)
        {
            _coordinator = coordinator;
            _downloadId = downloadId;
            _ct = ct;
        }

        public IAsyncEnumerable<ModelDownloadProgressEvent> ReadEventsAsync() => ReadTypedAsync(_ct);

        IAsyncEnumerable<object?> ISourceStream.ReadEventsAsync() => ReadObjectAsync(_ct);

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;

        private async IAsyncEnumerable<ModelDownloadProgressEvent> ReadTypedAsync(
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var p in _coordinator.StreamAsync(_downloadId, ct))
            {
                yield return new ModelDownloadProgressEvent(
                    p.DownloadId,
                    p.BytesRead,
                    p.TotalBytes,
                    p.Phase,
                    p.SpeedBytesPerSecond,
                    p.Error);
            }
        }

        private async IAsyncEnumerable<object?> ReadObjectAsync(
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var p in _coordinator.StreamAsync(_downloadId, ct))
            {
                yield return new ModelDownloadProgressEvent(
                    p.DownloadId,
                    p.BytesRead,
                    p.TotalBytes,
                    p.Phase,
                    p.SpeedBytesPerSecond,
                    p.Error);
            }
        }
    }
}
