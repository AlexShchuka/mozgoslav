using System;
using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-003 D5+D8: a single event emitted by Syncthing's <c>/rest/events</c>
/// long-polling endpoint. Only the kinds the app actually reacts to are
/// materialised as strongly-typed fields; everything else is captured in
/// <see cref="RawJson"/> for diagnostics. Mirrors the upstream contract
/// documented at <c>https://docs.syncthing.net/dev/events.html</c>.
/// </summary>
public sealed record SyncthingEvent(
    long Id,
    string Type,
    DateTimeOffset Time,
    string RawJson)
{
    /// <summary>
    /// <c>FolderCompletion</c>: a folder reached a particular completion percentage
    /// on the peer identified by <see cref="FolderCompletionPayload.Device"/>.
    /// Only populated when <see cref="Type"/> is <c>"FolderCompletion"</c>.
    /// </summary>
    public FolderCompletionPayload? FolderCompletion { get; init; }

    /// <summary>
    /// <c>DeviceConnected</c> or <c>DeviceDisconnected</c>.
    /// </summary>
    public DeviceConnectionPayload? DeviceConnection { get; init; }

    /// <summary>
    /// <c>PendingDevicesChanged</c> — a new (unknown) device asked to connect and
    /// needs the user's approval (UI toast + Accept button).
    /// </summary>
    public PendingDevicesPayload? PendingDevices { get; init; }

    /// <summary>
    /// Any of the <c>ItemFinished</c> / <c>LocalChangeDetected</c> / ... events whose
    /// body contains a <c>.sync-conflict-</c> path. Populated opportunistically by
    /// the SSE parser so the UI can surface conflicts without polling the file-system.
    /// </summary>
    public FileConflictPayload? FileConflict { get; init; }
}

/// <summary>Captured fields of the upstream <c>FolderCompletion</c> event data.</summary>
public sealed record FolderCompletionPayload(
    string Folder,
    string Device,
    double Completion,
    long NeedBytes,
    long GlobalBytes);

/// <summary>Captured fields of <c>DeviceConnected</c>/<c>DeviceDisconnected</c>.</summary>
public sealed record DeviceConnectionPayload(
    string DeviceId,
    bool Connected,
    string? Address,
    string? Error);

/// <summary>Captured fields of <c>PendingDevicesChanged</c> — all pending entries.</summary>
public sealed record PendingDevicesPayload(
    IReadOnlyList<PendingDeviceEntry> Added,
    IReadOnlyList<string> Removed);

public sealed record PendingDeviceEntry(
    string DeviceId,
    string? Name,
    string? Address);

/// <summary>Captured path of a <c>.sync-conflict-*</c> item.</summary>
public sealed record FileConflictPayload(
    string Folder,
    string Path);
