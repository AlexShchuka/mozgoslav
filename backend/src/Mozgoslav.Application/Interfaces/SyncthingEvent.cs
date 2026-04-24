using System;
using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

public sealed record SyncthingEvent(
    long Id,
    string Type,
    DateTimeOffset Time,
    string RawJson)
{
    public FolderCompletionPayload? FolderCompletion { get; init; }

    public DeviceConnectionPayload? DeviceConnection { get; init; }

    public PendingDevicesPayload? PendingDevices { get; init; }

    public FileConflictPayload? FileConflict { get; init; }
}

public sealed record FolderCompletionPayload(
    string Folder,
    string Device,
    double Completion,
    long NeedBytes,
    long GlobalBytes);

public sealed record DeviceConnectionPayload(
    string DeviceId,
    bool Connected,
    string? Address,
    string? Error);

public sealed record PendingDevicesPayload(
    IReadOnlyList<PendingDeviceEntry> Added,
    IReadOnlyList<string> Removed);

public sealed record PendingDeviceEntry(
    string DeviceId,
    string? Name,
    string? Address);

public sealed record FileConflictPayload(
    string Folder,
    string Path);
