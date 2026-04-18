using System.Runtime.CompilerServices;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// No-op Syncthing client used before the Syncthing lifecycle service lands in
/// Phase 2 Backend MR D. Avoids the log spam "Syncthing REST: Connection
/// refused (127.0.0.1:8384)" on every boot (ADR-007 bug 6) by short-circuiting
/// every call with a safe empty-state response. All methods return
/// <c>IsHealthy:false</c>-equivalent payloads and <see cref="ShutdownAsync"/>
/// is a no-op so app quit stays idempotent.
/// </summary>
public sealed class DisabledSyncthingClient : ISyncthingClient
{
    public Task<bool> IsHealthyAsync(CancellationToken ct) => Task.FromResult(false);

    public Task<SyncStatusSnapshot> GetStatusAsync(CancellationToken ct) =>
        Task.FromResult(new SyncStatusSnapshot(
            Folders: Array.Empty<SyncFolderStatus>(),
            Devices: Array.Empty<SyncDeviceStatus>()));

    public Task<string> GetLocalDeviceIdAsync(CancellationToken ct) =>
        Task.FromResult(string.Empty);

    public async IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        // Complete immediately — nothing to stream when Syncthing is disabled.
        await Task.CompletedTask;
        yield break;
    }

    public Task AcceptPendingDeviceAsync(
        string deviceId,
        string deviceName,
        IReadOnlyList<string> folderIds,
        CancellationToken ct) => Task.CompletedTask;

    public Task ShutdownAsync(CancellationToken ct) => Task.CompletedTask;

    public Task<string> GetConfigAsync(CancellationToken ct) =>
        Task.FromResult("{}");

    public Task ReplaceConfigAsync(string configJson, CancellationToken ct) =>
        Task.CompletedTask;

    public Task<IReadOnlyDictionary<string, FolderVersioning>> GetFolderVersioningsAsync(CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<string, FolderVersioning>>(
            new Dictionary<string, FolderVersioning>());
}
