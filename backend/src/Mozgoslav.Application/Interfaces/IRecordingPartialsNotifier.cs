using System;
using System.Threading.Channels;

namespace Mozgoslav.Application.Interfaces;

public sealed record RecordingPartialPayload(
    Guid RecordingId,
    Guid SessionId,
    string Text,
    double StartSeconds,
    double EndSeconds,
    bool IsFinal,
    DateTimeOffset ObservedAt);

public interface IRecordingPartialsNotifier
{
    ChannelReader<RecordingPartialPayload> SubscribeFor(Guid recordingId);
    void Publish(RecordingPartialPayload payload);
}
