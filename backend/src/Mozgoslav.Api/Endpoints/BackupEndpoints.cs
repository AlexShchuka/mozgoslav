using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class BackupEndpoints
{
    public static IEndpointRouteBuilder MapBackupEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/backup/create", async (
            BackupService service,
            CancellationToken ct) =>
        {
            try
            {
                var path = await service.CreateAsync(ct);
                var info = new FileInfo(path);
                return Results.Ok(new { path, sizeBytes = info.Length, createdAt = info.LastWriteTimeUtc });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapGet("/api/backup", (BackupService service) =>
        {
            var files = service.List().Select(f => new
            {
                name = f.Name,
                path = f.FullName,
                sizeBytes = f.Length,
                createdAt = f.LastWriteTimeUtc,
            });
            return Results.Ok(files);
        });

        return endpoints;
    }
}
