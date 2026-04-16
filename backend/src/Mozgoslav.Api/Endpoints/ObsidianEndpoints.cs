using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
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

        return endpoints;
    }
}
