using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

/// <summary>
/// ADR-003 D8 + ADR-004 R10: thin HTTP facade over <see cref="ISyncthingClient"/>.
/// Kept small by design — full Sync settings UI is an out-of-scope follow-up ADR.
/// </summary>
public static class SyncEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public sealed record AcceptDeviceRequest(
        string DeviceId,
        string Name,
        IReadOnlyList<string>? FolderIds);

    public static IEndpointRouteBuilder MapSyncEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/sync/status", async (
            ISyncthingClient client,
            CancellationToken ct) =>
        {
            try
            {
                var snapshot = await client.GetStatusAsync(ct);
                return Results.Ok(new
                {
                    folders = snapshot.Folders.Select(f => new
                    {
                        id = f.Id,
                        state = f.State,
                        completionPct = f.CompletionPct,
                        conflicts = f.Conflicts,
                    }),
                    devices = snapshot.Devices.Select(d => new
                    {
                        id = d.Id,
                        name = d.Name,
                        connected = d.Connected,
                        lastSeen = d.LastSeen,
                    }),
                });
            }
            catch (HttpRequestException ex)
            {
                return Results.Json(new
                {
                    error = "syncthing-unavailable",
                    message = ex.Message,
                }, statusCode: 503);
            }
        });

        endpoints.MapGet("/api/sync/health", async (
            ISyncthingClient client,
            CancellationToken ct) =>
        {
            var healthy = await client.IsHealthyAsync(ct);
            return Results.Ok(new { healthy });
        });

        // ADR-003 D5 — serve the payload the frontend encodes into a QR code.
        // We do not render the QR image on the backend on purpose: the frontend
        // already has `qrcode.react` for deterministic client-side rendering,
        // which avoids shipping an extra image library.
        endpoints.MapGet("/api/sync/pairing-payload", async (
            ISyncthingClient client,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            try
            {
                var deviceId = await client.GetLocalDeviceIdAsync(ct);
                var folderIds = new[]
                {
                    "mozgoslav-recordings",
                    "mozgoslav-notes",
                    "mozgoslav-obsidian-vault",
                };
                var payload = new
                {
                    deviceId,
                    folderIds,
                    // The URI format documented in ADR-003 D5.
                    uri = $"mozgoslav://sync-pair?deviceId={Uri.EscapeDataString(deviceId)}"
                        + $"&folderId={string.Join(",", folderIds)}"
                        + $"&vaultEnabled={(string.IsNullOrWhiteSpace(settings.SyncthingObsidianVaultPath) ? "false" : "true")}",
                };
                return Results.Ok(payload);
            }
            catch (HttpRequestException ex)
            {
                return Results.Json(new
                {
                    error = "syncthing-unavailable",
                    message = ex.Message,
                }, statusCode: 503);
            }
        });

        endpoints.MapPost("/api/sync/accept-device", async (
            [FromBody] AcceptDeviceRequest request,
            ISyncthingClient client,
            CancellationToken ct) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.DeviceId))
            {
                return Results.BadRequest(new { error = "deviceId is required" });
            }
            var folders = request.FolderIds ?? [
                "mozgoslav-recordings",
                "mozgoslav-notes",
                "mozgoslav-obsidian-vault",
            ];
            try
            {
                await client.AcceptPendingDeviceAsync(
                    request.DeviceId,
                    string.IsNullOrWhiteSpace(request.Name) ? "phone" : request.Name,
                    folders,
                    ct);
                return Results.Ok(new { accepted = true });
            }
            catch (HttpRequestException ex)
            {
                return Results.Json(new
                {
                    error = "syncthing-unavailable",
                    message = ex.Message,
                }, statusCode: 503);
            }
        });

        // ADR-003 D5: long-lived SSE bridge that forwards parsed Syncthing
        // events to the frontend (folder completion, pending devices, conflicts).
        endpoints.MapGet("/api/sync/events", async (
            HttpContext context,
            ISyncthingClient client,
            CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no";

            await context.Response.WriteAsync(":ok\n\n", ct);
            await context.Response.Body.FlushAsync(ct);

            await foreach (var evt in client.StreamEventsAsync(ct))
            {
                var payload = JsonSerializer.Serialize(new
                {
                    id = evt.Id,
                    type = evt.Type,
                    time = evt.Time,
                    folderCompletion = evt.FolderCompletion,
                    deviceConnection = evt.DeviceConnection,
                    pendingDevices = evt.PendingDevices,
                    fileConflict = evt.FileConflict,
                }, JsonOptions);

                await context.Response.WriteAsync($"event: syncthing\ndata: {payload}\n\n", Encoding.UTF8, ct);
                await context.Response.Body.FlushAsync(ct);
            }
        });

        return endpoints;
    }
}
