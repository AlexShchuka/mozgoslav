using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Sync;

public sealed record SyncPairingPayloadResult(
    string DeviceId,
    IReadOnlyList<string> FolderIds,
    string Uri);
