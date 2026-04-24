using System;
using System.Collections.Generic;
using System.Text.Json;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

#pragma warning disable IDISP004

public static class SyncthingSseEventParser
{
    public static SyncthingEvent? Parse(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!element.TryGetProperty("id", out var idProp) || !idProp.TryGetInt64(out var id))
        {
            return null;
        }
        if (!element.TryGetProperty("type", out var typeProp) || typeProp.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var type = typeProp.GetString() ?? string.Empty;
        var time = element.TryGetProperty("time", out var timeProp) && timeProp.ValueKind == JsonValueKind.String
            && DateTimeOffset.TryParse(timeProp.GetString(), out var parsed)
            ? parsed
            : DateTimeOffset.UnixEpoch;

        var raw = element.GetRawText();
        var data = element.TryGetProperty("data", out var dataProp) ? dataProp : default;

        return new SyncthingEvent(id, type, time, raw)
        {
            FolderCompletion = type == "FolderCompletion" ? ParseFolderCompletion(data) : null,
            DeviceConnection = type is "DeviceConnected" or "DeviceDisconnected"
                ? ParseDeviceConnection(data, connected: type == "DeviceConnected")
                : null,
            PendingDevices = type == "PendingDevicesChanged" ? ParsePendingDevices(data) : null,
            FileConflict = ParseFileConflict(type, data),
        };
    }

    public static IReadOnlyList<SyncthingEvent> ParseBatch(string json)
    {
        ArgumentNullException.ThrowIfNull(json);
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var result = new List<SyncthingEvent>(doc.RootElement.GetArrayLength());
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            var parsed = Parse(item);
            if (parsed is not null)
            {
                result.Add(parsed);
            }
        }
        return result;
    }

    private static FolderCompletionPayload? ParseFolderCompletion(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }
        return new FolderCompletionPayload(
            Folder: GetString(data, "folder") ?? string.Empty,
            Device: GetString(data, "device") ?? string.Empty,
            Completion: GetDouble(data, "completion"),
            NeedBytes: GetLong(data, "needBytes"),
            GlobalBytes: GetLong(data, "globalBytes"));
    }

    private static DeviceConnectionPayload? ParseDeviceConnection(JsonElement data, bool connected)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }
        return new DeviceConnectionPayload(
            DeviceId: GetString(data, "id") ?? GetString(data, "device") ?? string.Empty,
            Connected: connected,
            Address: GetString(data, "addr"),
            Error: GetString(data, "error"));
    }

    private static PendingDevicesPayload? ParsePendingDevices(JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var added = new List<PendingDeviceEntry>();
        if (data.TryGetProperty("added", out var addedArr) && addedArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in addedArr.EnumerateArray())
            {
                if (entry.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }
                added.Add(new PendingDeviceEntry(
                    DeviceId: GetString(entry, "deviceID") ?? GetString(entry, "device") ?? string.Empty,
                    Name: GetString(entry, "name"),
                    Address: GetString(entry, "address")));
            }
        }

        var removed = new List<string>();
        if (data.TryGetProperty("removed", out var removedArr) && removedArr.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in removedArr.EnumerateArray())
            {
                if (entry.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }
                var id = GetString(entry, "deviceID") ?? GetString(entry, "device");
                if (!string.IsNullOrWhiteSpace(id))
                {
                    removed.Add(id);
                }
            }
        }

        return new PendingDevicesPayload(added, removed);
    }

    private static FileConflictPayload? ParseFileConflict(string type, JsonElement data)
    {
        if (data.ValueKind != JsonValueKind.Object)
        {
            return null;
        }
        if (type is not ("ItemFinished" or "LocalChangeDetected" or "RemoteChangeDetected"))
        {
            return null;
        }
        var path = GetString(data, "item") ?? GetString(data, "path");
        if (string.IsNullOrWhiteSpace(path) || !path.Contains(".sync-conflict-", StringComparison.Ordinal))
        {
            return null;
        }
        return new FileConflictPayload(
            Folder: GetString(data, "folder") ?? string.Empty,
            Path: path);
    }

    private static string? GetString(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String ? prop.GetString() : null;

    private static double GetDouble(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var prop) && prop.TryGetDouble(out var v) ? v : 0d;

    private static long GetLong(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var prop) && prop.TryGetInt64(out var v) ? v : 0L;
}
