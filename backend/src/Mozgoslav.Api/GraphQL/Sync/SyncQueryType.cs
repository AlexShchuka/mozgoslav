using System;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Sync;

[ExtendObjectType(typeof(QueryType))]
public sealed class SyncQueryType
{
    public async Task<SyncStatusResult?> SyncStatus(
        [Service] ISyncthingClient client,
        CancellationToken ct)
    {
        try
        {
            var snapshot = await client.GetStatusAsync(ct);
            return new SyncStatusResult(
                snapshot.Folders.Select(f => new SyncFolderEntry(f.Id, f.State, f.CompletionPct, f.Conflicts)).ToArray(),
                snapshot.Devices.Select(d => new SyncDeviceEntry(d.Id, d.Name, d.Connected, d.LastSeen)).ToArray());
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    public async Task<bool> SyncHealth(
        [Service] ISyncthingClient client,
        CancellationToken ct)
    {
        return await client.IsHealthyAsync(ct);
    }

    public async Task<SyncPairingPayloadResult?> SyncPairingPayload(
        [Service] ISyncthingClient client,
        [Service] IAppSettings settings,
        CancellationToken ct)
    {
        try
        {
            var deviceId = await client.GetLocalDeviceIdAsync(ct);
            var folderIds = new[] { "mozgoslav-recordings", "mozgoslav-notes", "mozgoslav-obsidian-vault" };
            var uri = $"mozgoslav://sync-pair?deviceId={Uri.EscapeDataString(deviceId)}"
                + $"&folderId={string.Join(",", folderIds)}"
                + $"&vaultEnabled={(string.IsNullOrWhiteSpace(settings.SyncthingObsidianVaultPath) ? "false" : "true")}";
            return new SyncPairingPayloadResult(deviceId, folderIds, uri);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}
