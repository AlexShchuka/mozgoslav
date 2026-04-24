using System;
using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Sync;

public sealed record SyncStatusResult(
    IReadOnlyList<SyncFolderEntry> Folders,
    IReadOnlyList<SyncDeviceEntry> Devices);

public sealed record SyncFolderEntry(
    string Id,
    string State,
    double CompletionPct,
    int Conflicts);

public sealed record SyncDeviceEntry(
    string Id,
    string Name,
    bool Connected,
    DateTimeOffset? LastSeen);
