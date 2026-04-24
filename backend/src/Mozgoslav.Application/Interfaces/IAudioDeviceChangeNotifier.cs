using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IAudioDeviceChangeNotifier
{
    ValueTask PublishAsync(AudioDeviceChangePayload payload, CancellationToken ct);

    IAsyncEnumerable<AudioDeviceChangePayload> SubscribeAsync(CancellationToken ct);
}

public sealed record AudioDeviceChangePayload(
    string Kind,
    IReadOnlyList<AudioDeviceInfo> Devices,
    DateTime ObservedAt);

public sealed record AudioDeviceInfo(
    string Id,
    string Name,
    bool IsDefault);
