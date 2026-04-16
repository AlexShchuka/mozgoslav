using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Endpoints;

/// <summary>
/// Exposes the application log directory so the UI can surface recent log lines
/// without having to open Finder. All paths are resolved under <see cref="AppPaths.Logs"/>.
/// </summary>
public static class LogsEndpoints
{
    public static IEndpointRouteBuilder MapLogsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/logs", () =>
        {
            if (!Directory.Exists(AppPaths.Logs))
            {
                return Results.Ok(Array.Empty<object>());
            }

            var files = new DirectoryInfo(AppPaths.Logs)
                .GetFiles("*.log")
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .Select(f => new
                {
                    name = f.Name,
                    sizeBytes = f.Length,
                    modified = f.LastWriteTimeUtc
                })
                .ToArray();
            return Results.Ok(files);
        });

        endpoints.MapGet("/api/logs/tail", async (
            string? file,
            int? lines,
            CancellationToken ct) =>
        {
            var lineCount = Math.Clamp(lines ?? 200, 1, 5000);
            var target = ResolveLatestLogFile(file);
            if (target is null || !File.Exists(target))
            {
                return Results.NotFound(new { error = "Log file not found" });
            }

            var tail = await ReadLastLinesAsync(target, lineCount, ct);
            return Results.Ok(new { file = Path.GetFileName(target), lines = tail });
        });

        return endpoints;
    }

    private static string? ResolveLatestLogFile(string? requested)
    {
        if (!Directory.Exists(AppPaths.Logs))
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(requested))
        {
            var safe = Path.GetFileName(requested);
            return Path.Combine(AppPaths.Logs, safe);
        }

        return new DirectoryInfo(AppPaths.Logs)
            .GetFiles("*.log")
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .FirstOrDefault()?.FullName;
    }

    private static async Task<IReadOnlyList<string>> ReadLastLinesAsync(string path, int lineCount, CancellationToken ct)
    {
        var all = new List<string>(capacity: lineCount);
        using var reader = new StreamReader(File.Open(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite));
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) is not null)
        {
            if (all.Count == lineCount)
            {
                all.RemoveAt(0);
            }
            all.Add(line);
        }
        return all;
    }
}
