using System;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Sync;

public sealed record SyncEventMessage(
    long Id,
    string Type,
    DateTimeOffset Time,
    FolderCompletionPayload? FolderCompletion,
    DeviceConnectionPayload? DeviceConnection,
    PendingDevicesPayload? PendingDevices,
    FileConflictPayload? FileConflict);
