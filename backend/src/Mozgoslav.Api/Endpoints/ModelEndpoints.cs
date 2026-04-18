using System.Text.Json;

using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class ModelEndpoints
{
    // Legacy field name ``id`` still accepted; new frontends may use
    // ``catalogueId`` per ADR-007-shared §2.3. Both fields hit the same
    // resolver (<see cref="ModelCatalog.TryGet"/>).
    public sealed record DownloadRequest(string? Id, string? CatalogueId)
    {
        public string? Resolve() => string.IsNullOrWhiteSpace(CatalogueId) ? Id : CatalogueId;
    }

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
                // Task #12b — Onboarding uses this to surface only Tier 1
                // (bundled) models on the first-run "Скачать" card.
                tier = m.Tier.ToString().ToLowerInvariant(),
                m.IsDefault,
                destinationPath = ResolveDestination(m),
                installed = File.Exists(ResolveDestination(m))
            });
            return Results.Ok(models);
        });

        // ADR-007-shared §2.3 — async 202 + SSE progress. Returns immediately
        // with a downloadId; the actual transfer runs in the background and
        // emits progress events on ``/api/models/download/stream``.
        endpoints.MapPost("/api/models/download", (
            DownloadRequest request,
            IModelDownloadCoordinator coordinator,
            CancellationToken ct) =>
        {
            var catalogueId = request.Resolve();
            if (string.IsNullOrWhiteSpace(catalogueId))
            {
                return Results.BadRequest(new { error = "catalogueId is required" });
            }

            var entry = ModelCatalog.TryGet(catalogueId);
            if (entry is null)
            {
                return Results.BadRequest(new { error = $"Unknown model id: {catalogueId}" });
            }

            var destination = ResolveDestination(entry);
            var downloadId = coordinator.Start(catalogueId, entry.Url, destination, ct);
            return Results.Accepted(
                uri: $"/api/models/download/stream?downloadId={downloadId}",
                value: new { downloadId });
        });

        // ADR-007-shared §2.7 BC-033 — filesystem scan for pre-downloaded
        // Whisper / VAD model files. Returns 404 when the directory does not
        // exist so the UI can prompt the user to pick a different folder.
        // Non-recursive: we only show the top-level files so a user who
        // points the scan at ``~/Downloads`` isn't overwhelmed.
        endpoints.MapGet("/api/models/scan", (string? dir) =>
        {
            if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir))
            {
                return Results.NotFound();
            }

            var files = Directory
                .EnumerateFiles(dir, "*", SearchOption.TopDirectoryOnly)
                .Where(p =>
                    p.EndsWith(".bin", StringComparison.OrdinalIgnoreCase)
                    || p.EndsWith(".gguf", StringComparison.OrdinalIgnoreCase))
                .Select(p =>
                {
                    var info = new FileInfo(p);
                    return new
                    {
                        path = p,
                        filename = info.Name,
                        size = info.Length,
                        kind = ClassifyModel(info.Name),
                    };
                })
                .ToList();
            return Results.Ok(files);
        });

        endpoints.MapGet("/api/models/download/stream", async (
            HttpContext http,
            IModelDownloadCoordinator coordinator,
            CancellationToken ct) =>
        {
            var downloadId = http.Request.Query["downloadId"].ToString();
            if (string.IsNullOrWhiteSpace(downloadId))
            {
                http.Response.StatusCode = 400;
                await http.Response.WriteAsync("downloadId is required", ct);
                return;
            }

            http.Response.Headers.ContentType = "text/event-stream";
            http.Response.Headers.CacheControl = "no-cache";
            http.Response.Headers["X-Accel-Buffering"] = "no";

            await foreach (var progress in coordinator.StreamAsync(downloadId, ct))
            {
                var payload = JsonSerializer.Serialize(progress, SerializerOptions);
                await http.Response.WriteAsync("event: progress\n", ct);
                await http.Response.WriteAsync($"data: {payload}\n\n", ct);
                await http.Response.Body.FlushAsync(ct);
                if (progress.Done)
                {
                    break;
                }
            }
        });

        return endpoints;
    }

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = Path.GetFileName(new Uri(entry.Url).AbsolutePath);
        return Path.Combine(AppPaths.Models, fileName);
    }

    // ADR-007-shared §2.7 — `kind` heuristic is a pure filename check so the
    // scan endpoint doesn't have to read the GGUF header. The frontend uses
    // the value to pre-select the right "model type" dropdown after a scan.
    private static string ClassifyModel(string fileName)
    {
        var lower = fileName.ToLowerInvariant();
        if (lower.StartsWith("ggml", StringComparison.Ordinal)
            && !lower.Contains("silero", StringComparison.Ordinal)
            && !lower.Contains("vad", StringComparison.Ordinal))
        {
            return "whisper-ggml";
        }
        if (lower.Contains("silero", StringComparison.Ordinal)
            || lower.Contains("vad", StringComparison.Ordinal))
        {
            return "vad-gguf";
        }
        return "unknown";
    }
}
