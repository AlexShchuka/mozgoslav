using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Execution;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Subscriptions;

namespace Mozgoslav.Api.GraphQL.Dictation;

[ExtendObjectType(typeof(SubscriptionType))]
public sealed class DictationSubscriptionType
{
    public async ValueTask<ISourceStream<DictationPartialEvent>> SubscribeToDictationEvents(
        Guid sessionId,
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<DictationPartialEvent>(DictationTopics.ForSession(sessionId), ct);
    }

    [Subscribe(With = nameof(SubscribeToDictationEvents))]
    public DictationPartialEvent DictationEvents([EventMessage] DictationPartialEvent message) => message;

    public async ValueTask<ISourceStream<AudioDeviceChangedEvent>> SubscribeToAudioDeviceChanged(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<AudioDeviceChangedEvent>(DictationTopics.AudioDeviceChanged, ct);
    }

    [Subscribe(With = nameof(SubscribeToAudioDeviceChanged))]
    public AudioDeviceChangedEvent AudioDeviceChanged([EventMessage] AudioDeviceChangedEvent message) => message;

    public async ValueTask<ISourceStream<HotkeyEventMessage>> SubscribeToHotkeyEvents(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct)
    {
        return await receiver.SubscribeAsync<HotkeyEventMessage>(DictationTopics.HotkeyEvents, ct);
    }

    [Subscribe(With = nameof(SubscribeToHotkeyEvents))]
    public HotkeyEventMessage HotkeyEvents([EventMessage] HotkeyEventMessage message) => message;
}
