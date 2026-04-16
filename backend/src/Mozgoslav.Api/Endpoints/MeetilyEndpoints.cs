using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class MeetilyEndpoints
{
    public sealed record ImportRequest(string MeetilyDatabasePath);

    public static IEndpointRouteBuilder MapMeetilyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/meetily/import", async (
            ImportRequest request,
            MeetilyImporterService importer,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.MeetilyDatabasePath))
            {
                return Results.BadRequest(new { error = "meetilyDatabasePath is required" });
            }

            try
            {
                var report = await importer.ImportAsync(request.MeetilyDatabasePath, ct);
                return Results.Ok(report);
            }
            catch (FileNotFoundException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        return endpoints;
    }
}
