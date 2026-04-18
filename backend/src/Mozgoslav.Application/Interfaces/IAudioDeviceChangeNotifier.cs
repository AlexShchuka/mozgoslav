namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// D3 — hot-plug audio device events. The Swift helper observes
/// <c>AVCaptureDevice.wasConnected/wasDisconnected</c> and POSTs the current
/// device list to <c>/_internal/devices/changed</c>; the endpoint publishes
/// the payload here and an SSE endpoint re-emits it to the renderer so the
/// Dashboard can toast + re-enable Start when a mic is removed mid-session.
/// </summary>
public interface IAudioDeviceChangeNotifier
{
    /// <summary>Publishes a device-change snapshot to every SSE subscriber.</summary>
    ValueTask PublishAsync(AudioDeviceChangePayload payload, CancellationToken ct);

    /// <summary>Consumes device-change events; the enumeration completes on token cancel.</summary>
    IAsyncEnumerable<AudioDeviceChangePayload> SubscribeAsync(CancellationToken ct);
}

/// <summary>
/// Device-change payload — minimal shape consumed by the renderer. <see cref="Devices"/>
/// is whatever the Swift helper enumerates via <c>AVCaptureDevice.DiscoverySession</c>
/// at the moment of the event; ordering matters (first = default).
/// </summary>
public sealed record AudioDeviceChangePayload(
    string Kind,
    IReadOnlyList<AudioDeviceInfo> Devices,
    DateTime ObservedAt);

public sealed record AudioDeviceInfo(
    string Id,
    string Name,
    bool IsDefault);
