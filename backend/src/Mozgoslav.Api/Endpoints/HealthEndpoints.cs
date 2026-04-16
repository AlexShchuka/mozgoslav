namespace Mozgoslav.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet(
            "/api/health",
            () => Results.Ok(new
            {
                status = "ok",
                time = DateTime.UtcNow.ToString("O")
            }));

        return endpoints;
    }
}
