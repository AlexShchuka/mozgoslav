using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

/// <summary>
/// ADR-003 D8 + ADR-004 R10: thin HTTP facade over <see cref="ISyncthingClient"/>.
/// Kept small by design — full Sync settings UI is an out-of-scope follow-up ADR.
/// </summary>
public static class SyncEndpoints
{
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

        return endpoints;
    }
}
