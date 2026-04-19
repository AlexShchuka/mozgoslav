using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class ObsidianEndpoints
{
    public sealed record SetupRequest(string? VaultPath);

    public sealed record OpenNoteRequest(string Path);

    public static IEndpointRouteBuilder MapObsidianEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/obsidian/setup", async (
            SetupRequest request,
            ObsidianSetupService service,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var target = string.IsNullOrWhiteSpace(request.VaultPath) ? settings.VaultPath : request.VaultPath;
            if (string.IsNullOrWhiteSpace(target))
            {
                return Results.BadRequest(new { error = "Vault path is not configured" });
            }

            try
            {
                var report = await service.SetupAsync(target, ct);
                if (string.IsNullOrWhiteSpace(settings.VaultPath))
                {
                    await settings.SaveAsync(settings.Snapshot with { VaultPath = target }, ct);
                }
                return Results.Ok(report);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/obsidian/export-all", async (
            IObsidianExportService service,
            CancellationToken ct) =>
        {
            try
            {
                var result = await service.ExportAllUnexportedAsync(ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/obsidian/apply-layout", async (
            IObsidianLayoutService service,
            CancellationToken ct) =>
        {
            try
            {
                var result = await service.ApplyParaLayoutAsync(ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapGet("/api/obsidian/rest-health", async (
            IObsidianRestClient client,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var host = settings.ObsidianApiHost;
            var reachable = await client.IsReachableAsync(ct);
            if (!reachable)
            {
                return Results.Ok(new
                {
                    reachable = false,
                    host,
                    version = (string?)null,
                    diagnostic = string.IsNullOrWhiteSpace(settings.ObsidianApiToken)
                        ? "Token is empty — fill in Settings → Obsidian to enable REST."
                        : "Plugin unreachable or token invalid.",
                });
            }
            try
            {
                var info = await client.GetVaultInfoAsync(ct);
                return Results.Ok(new
                {
                    reachable = true,
                    host,
                    version = info.Version,
                    diagnostic = "Connected.",
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { reachable = false, host, version = (string?)null, diagnostic = ex.Message });
            }
        });

        endpoints.MapPost("/api/obsidian/open", async (
            OpenNoteRequest request,
            IObsidianRestClient client,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Path))
            {
                return Results.BadRequest(new { error = "path is required" });
            }
            if (await client.IsReachableAsync(ct))
            {
                try
                {
                    await client.OpenNoteAsync(request.Path, ct);
                    return Results.Ok(new { opened = true, via = "rest" });
                }
                catch (Exception)
                {
                }
            }
            var vault = settings.VaultPath;
            if (string.IsNullOrWhiteSpace(vault))
            {
                return Results.BadRequest(new { error = "Vault path is not configured and REST is unreachable." });
            }
            var absolute = Path.Combine(vault, request.Path);
            if (!File.Exists(absolute))
            {
                return Results.NotFound(new { error = $"Note not found: {absolute}" });
            }
            return Results.Ok(new { opened = true, via = "file", path = absolute });
        });

        endpoints.MapGet("/api/obsidian/detect", () =>
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string[] candidates =
            [
                Path.Combine(home, "Documents", "Obsidian Vault"),
                Path.Combine(home, "Obsidian"),
                Path.Combine(home, "Documents", "Obsidian"),
            ];
            var matches = candidates
                .Where(Directory.Exists)
                .Where(p => Directory.Exists(Path.Combine(p, ".obsidian")))
                .Select(p => new { path = p, name = Path.GetFileName(p) })
                .ToList();
            return Results.Ok(new { detected = matches, searched = candidates });
        });

        return endpoints;
    }
}
