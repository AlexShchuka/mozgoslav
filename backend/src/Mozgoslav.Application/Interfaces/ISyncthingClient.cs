namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Port over Syncthing's REST API (ADR-003 D3). The implementation lives in
/// <c>Mozgoslav.Infrastructure.Services.SyncthingHttpClient</c>; tests use a
/// fake. Only the endpoints we actually need are surfaced — keep the surface
/// minimal (YAGNI) and add methods as higher-level features demand them.
/// </summary>
public interface ISyncthingClient
{
    /// <summary>Returns <c>true</c> if <c>GET /rest/system/status</c> returns 200.</summary>
    Task<bool> IsHealthyAsync(CancellationToken ct);

    /// <summary>Current sync state across the three managed folders + peer devices.</summary>
    Task<SyncStatusSnapshot> GetStatusAsync(CancellationToken ct);

    /// <summary>Local device id (printed on the pairing QR).</summary>
    Task<string> GetLocalDeviceIdAsync(CancellationToken ct);

    /// <summary>
    /// Long-poll <c>/rest/events</c> and surface parsed envelopes as an
    /// async stream. The implementation silently retries on transient errors
    /// and tracks the <c>lastEventId</c> so a caller that subscribes at
    /// startup never misses an event.
    /// </summary>
    IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(CancellationToken ct);

    /// <summary>
    /// ADR-003 D5: accept a pending device (the QR-pair flow ends here).
    /// Calls <c>POST /rest/cluster/pending/devices</c> with the auto-accept body
    /// so Syncthing also auto-accepts the folders the peer asked to share.
    /// </summary>
    Task AcceptPendingDeviceAsync(
        string deviceId,
        string deviceName,
        IReadOnlyList<string> folderIds,
        CancellationToken ct);

    /// <summary>Graceful shutdown — <c>POST /rest/system/shutdown</c>. Called from Electron on app quit.</summary>
    Task ShutdownAsync(CancellationToken ct);

    /// <summary>
    /// Low-level config round-trip for advanced ops. Returns the raw JSON; callers
    /// that need to mutate config must <c>PUT</c> it back via
    /// <see cref="ReplaceConfigAsync"/>. We deliberately do not surface a typed
    /// domain model of <c>config.json</c> — it is the Syncthing team's contract,
    /// not ours, and evolves per minor version.
    /// </summary>
    Task<string> GetConfigAsync(CancellationToken ct);

    /// <inheritdoc cref="GetConfigAsync"/>
    Task ReplaceConfigAsync(string configJson, CancellationToken ct);
}

/// <summary>
/// Data contract for <c>/api/sync/status</c> (ADR-004 R10).
/// </summary>
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
