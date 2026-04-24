using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class DisabledSyncthingClient : ISyncthingClient
{
    public Task<bool> IsHealthyAsync(CancellationToken ct) => Task.FromResult(false);

    public Task<SyncStatusSnapshot> GetStatusAsync(CancellationToken ct) =>
        Task.FromResult(new SyncStatusSnapshot(
            Folders: [],
            Devices: []));

    public Task<string> GetLocalDeviceIdAsync(CancellationToken ct) =>
        Task.FromResult(string.Empty);

    public async IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
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
