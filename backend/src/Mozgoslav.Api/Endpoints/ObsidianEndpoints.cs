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

        // ADR-007-shared §2.6 BC-025 — bulk export every not-yet-exported
        // ProcessedNote. Responds 400 when no vault is configured so the UI
        // can surface the config gap instead of silently reporting "0/0".
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

        // ADR-007-shared §2.6 BC-025 — create the PARA scaffolding under the
        // vault and (future work) move already-exported notes into the
        // correct bucket. Idempotent: second call reports createdFolders = 0.
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

        // Plan v0.8 Block 6 — REST health probe so Settings → Obsidian can
        // surface "Connected (v1.2.3)" / "Unreachable — using file-I/O".
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

        // Plan v0.8 Block 6 — open-note. Tries REST first; falls back to file-I/O
        // via the IAppSettings.VaultPath so the UX works even when the plugin
        // is not installed.
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
                    // fall through to file-I/O
                }
            }
            var vault = settings.VaultPath;
            if (string.IsNullOrWhiteSpace(vault))
            {
                return Results.BadRequest(new { error = "Vault path is not configured and REST is unreachable." });
            }
            var absolute = System.IO.Path.Combine(vault, request.Path);
            if (!System.IO.File.Exists(absolute))
            {
                return Results.NotFound(new { error = $"Note not found: {absolute}" });
            }
            return Results.Ok(new { opened = true, via = "file", path = absolute });
        });

        // Plan v0.8 Block 4 — vault autodetect for the Onboarding wizard.
        endpoints.MapGet("/api/obsidian/detect", () =>
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string[] candidates =
            [
                System.IO.Path.Combine(home, "Documents", "Obsidian Vault"),
                System.IO.Path.Combine(home, "Obsidian"),
                System.IO.Path.Combine(home, "Documents", "Obsidian"),
            ];
            var matches = candidates
                .Where(System.IO.Directory.Exists)
                .Where(p => System.IO.Directory.Exists(System.IO.Path.Combine(p, ".obsidian")))
                .Select(p => new { path = p, name = System.IO.Path.GetFileName(p) })
                .ToList();
            return Results.Ok(new { detected = matches, searched = candidates });
        });

        return endpoints;
    }
}
