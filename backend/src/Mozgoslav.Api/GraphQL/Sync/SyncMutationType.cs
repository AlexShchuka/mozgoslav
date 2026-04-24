using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Sync;

[ExtendObjectType(typeof(MutationType))]
public sealed class SyncMutationType
{
    public async Task<AcceptSyncDevicePayload> AcceptSyncDevice(
        string deviceId,
        string? name,
        IReadOnlyList<string>? folderIds,
        [Service] ISyncthingClient client,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            return new AcceptSyncDevicePayload(false, [new ValidationError("VALIDATION", "deviceId is required", "deviceId")]);
        }
        var folders = folderIds ?? ["mozgoslav-recordings", "mozgoslav-notes", "mozgoslav-obsidian-vault"];
        try
        {
            await client.AcceptPendingDeviceAsync(
                deviceId,
                string.IsNullOrWhiteSpace(name) ? "phone" : name,
                folders,
                ct);
            return new AcceptSyncDevicePayload(true, []);
        }
        catch (HttpRequestException ex)
        {
            return new AcceptSyncDevicePayload(false, [new UnavailableError("SYNCTHING_UNAVAILABLE", ex.Message)]);
        }
    }
}
