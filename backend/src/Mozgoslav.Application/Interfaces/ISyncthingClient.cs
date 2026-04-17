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
