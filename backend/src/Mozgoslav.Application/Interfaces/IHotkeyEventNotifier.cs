namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// NEXT H1 — fan-out notifier for global dictation hotkey events. The Swift
/// helper observes the configured accelerator via
/// <c>NSEvent.addGlobalMonitorForEvents(.keyDown/.keyUp)</c> and POSTs
/// <see cref="HotkeyEvent"/> to <c>/_internal/hotkey/event</c>; the endpoint
/// publishes here and an SSE endpoint re-emits to the renderer so Electron
/// main can drive DictationOrchestrator's start / stop in true push-to-talk
/// semantics. `globalShortcut`'s keydown-only contract cannot express keyup.
/// </summary>
public interface IHotkeyEventNotifier
{
    ValueTask PublishAsync(HotkeyEvent payload, CancellationToken ct);
    IAsyncEnumerable<HotkeyEvent> SubscribeAsync(CancellationToken ct);
}

/// <summary>
/// Kind: "press" | "release" — press matches keyDown, release matches keyUp.
/// <see cref="Accelerator"/> echoes the accelerator the helper matched (so a
/// future multi-hotkey world keeps events routable) and <see cref="ObservedAt"/>
/// is the Swift-side timestamp used for diagnostics.
/// </summary>
public sealed record HotkeyEvent(
    string Kind,
    string Accelerator,
    DateTime ObservedAt);
