using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class SettingsEndpoints
{
    public static IEndpointRouteBuilder MapSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/settings", async (
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var snapshot = await settings.LoadAsync(ct);
            return Results.Ok(snapshot);
        });

        endpoints.MapPut("/api/settings", async (
            AppSettingsDto dto,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            if (dto is null)
            {
                return Results.BadRequest(new { error = "Settings payload is required" });
            }

            await settings.SaveAsync(dto, ct);
            return Results.Ok(dto);
        });

        endpoints.MapGet("/api/health/llm", async (
            ILlmService llm,
            CancellationToken ct) =>
        {
            var available = await llm.IsAvailableAsync(ct);
            return Results.Ok(new { available });
        });

        return endpoints;
    }
}
