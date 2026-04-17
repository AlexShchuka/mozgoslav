using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Endpoints;

public static class ModelEndpoints
{
    public static IEndpointRouteBuilder MapModelEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // ADR-006 D-11: models page is read-only. No download endpoint — users
        // grab LLM weights via LM Studio, and Whisper/VAD files are inspected
        // (not fetched) here.
        endpoints.MapGet("/api/models", () =>
        {
            var models = ModelCatalog.All.Select(m => new
            {
                m.Id,
                m.Name,
                m.Description,
                kind = m.Kind.ToString().ToLowerInvariant(),
                m.IsDefault,
                destinationPath = ResolveDestination(m),
                installed = File.Exists(ResolveDestination(m))
            });
            return Results.Ok(models);
        });

        return endpoints;
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = Path.GetFileName(new Uri(entry.Url).AbsolutePath);
        return Path.Combine(AppPaths.Models, fileName);
    }
}
