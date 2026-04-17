using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class LmStudioEndpoints
{
    public static IEndpointRouteBuilder MapLmStudioEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/lmstudio/models", async (
            ILmStudioClient client,
            CancellationToken ct) =>
        {
            var models = await client.ListModelsAsync(ct);
            return Results.Ok(new { @object = "list", data = models });
        });

        return endpoints;
    }
}
