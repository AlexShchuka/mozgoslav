using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IHotkeyEventNotifier
{
    ValueTask PublishAsync(HotkeyEvent payload, CancellationToken ct);
    IAsyncEnumerable<HotkeyEvent> SubscribeAsync(CancellationToken ct);
}

public sealed record HotkeyEvent(
    string Kind,
    string Accelerator,
    DateTime ObservedAt);
