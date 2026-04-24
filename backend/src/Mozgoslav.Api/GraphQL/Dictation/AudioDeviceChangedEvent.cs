using System;
using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record AudioDeviceChangedEvent(
    string Kind,
    IReadOnlyList<AudioDeviceEntry> Devices,
    DateTime ObservedAt);

public sealed record AudioDeviceEntry(
    string Id,
    string Name,
    bool IsDefault);
