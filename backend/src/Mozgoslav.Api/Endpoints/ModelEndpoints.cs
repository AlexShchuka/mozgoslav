using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Mozgoslav.Api.Models;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class ModelEndpoints
{
    public sealed record DownloadRequest(string Id);

    public static IEndpointRouteBuilder MapModelEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/models", () =>
        {
            var models = ModelCatalog.All.Select(m => new
            {
                m.Id,
                m.Name,
                m.Description,
                m.Url,
                m.SizeMb,
                kind = m.Kind.ToString().ToLowerInvariant(),
                m.IsDefault,
                destinationPath = ResolveDestination(m),
                installed = File.Exists(ResolveDestination(m)),
            });
            return Results.Ok(models);
        });

        endpoints.MapPost("/api/models/download", async (
            DownloadRequest request,
            ModelDownloadService downloader,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var entry = ModelCatalog.TryGet(request.Id);
            if (entry is null)
            {
                return Results.BadRequest(new { error = $"Unknown model id: {request.Id}" });
            }

            var destination = ResolveDestination(entry);
            await downloader.DownloadAsync(entry.Url, destination, progress: null, ct);

            // If this is the default STT/VAD model and settings are empty,
            // auto-point the setting at the freshly downloaded file.
            var updated = settings.Snapshot;
            if (entry.Kind == ModelKind.Stt && string.IsNullOrWhiteSpace(settings.WhisperModelPath))
            {
                updated = updated with { WhisperModelPath = destination };
            }
            else if (entry.Kind == ModelKind.Vad && string.IsNullOrWhiteSpace(settings.VadModelPath))
            {
                updated = updated with { VadModelPath = destination };
            }
            if (!ReferenceEquals(updated, settings.Snapshot))
            {
                await settings.SaveAsync(updated, ct);
            }

            return Results.Ok(new { entry.Id, destinationPath = destination, installed = true });
        });

        return endpoints;
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = Path.GetFileName(new Uri(entry.Url).AbsolutePath);
        return Path.Combine(AppPaths.Models, fileName);
    }
}
