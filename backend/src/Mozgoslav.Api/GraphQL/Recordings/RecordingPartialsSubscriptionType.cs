using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Recordings;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class RecordingPartialsSubscriptionType
{
    public ISourceStream<RecordingPartialPayload> SubscribeToRecordingPartials(
        Guid recordingId,
        [Service] IRecordingPartialsNotifier notifier)
    {
        var reader = notifier.SubscribeFor(recordingId);
        return new ChannelReaderSourceStream(reader);
    }

    [Subscribe(With = nameof(SubscribeToRecordingPartials))]
    public RecordingPartialPayload RecordingPartials([EventMessage] RecordingPartialPayload message) => message;

    private sealed class ChannelReaderSourceStream : ISourceStream<RecordingPartialPayload>
    {
        private readonly ChannelReader<RecordingPartialPayload> _reader;

        public ChannelReaderSourceStream(ChannelReader<RecordingPartialPayload> reader)
        {
            _reader = reader;
        }

        public IAsyncEnumerable<RecordingPartialPayload> ReadEventsAsync() => ReadTypedAsync(default);

        IAsyncEnumerable<object?> ISourceStream.ReadEventsAsync() => ReadObjectAsync(default);

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;

        private async IAsyncEnumerable<RecordingPartialPayload> ReadTypedAsync(
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var item in _reader.ReadAllAsync(ct))
            {
                yield return item;
            }
        }

        private async IAsyncEnumerable<object?> ReadObjectAsync(
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var item in _reader.ReadAllAsync(ct))
            {
                yield return item;
            }
        }
    }
}
