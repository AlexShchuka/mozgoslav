using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface ISyncthingClient
{
    Task<bool> IsHealthyAsync(CancellationToken ct);

    Task<SyncStatusSnapshot> GetStatusAsync(CancellationToken ct);

    Task<string> GetLocalDeviceIdAsync(CancellationToken ct);

    IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(CancellationToken ct);

    Task AcceptPendingDeviceAsync(
        string deviceId,
        string deviceName,
        IReadOnlyList<string> folderIds,
        CancellationToken ct);

    Task ShutdownAsync(CancellationToken ct);

    Task<string> GetConfigAsync(CancellationToken ct);

    Task ReplaceConfigAsync(string configJson, CancellationToken ct);

    Task<IReadOnlyDictionary<string, FolderVersioning>> GetFolderVersioningsAsync(CancellationToken ct);
}

public sealed record FolderVersioning(string Type, IReadOnlyDictionary<string, string> Params);

public sealed record SyncStatusSnapshot(
    IReadOnlyList<SyncFolderStatus> Folders,
    IReadOnlyList<SyncDeviceStatus> Devices);

public sealed record SyncFolderStatus(
    string Id,
    string State,
    double CompletionPct,
    int Conflicts);

public sealed record SyncDeviceStatus(
    string Id,
    string Name,
    bool Connected,
    DateTimeOffset? LastSeen);
