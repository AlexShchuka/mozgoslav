using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class ObsidianEndpoints
{
    public sealed record SetupRequest(string? VaultPath);

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

        return endpoints;
    }
}
