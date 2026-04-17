using System.Globalization;
using System.Reflection;

namespace Mozgoslav.Api.Endpoints;

/// <summary>
/// Plan v0.8 Block 7 — <c>GET /api/meta</c>. Exposes build metadata so the
/// DMG validation pass can verify "this is the right build" quickly without
/// scraping the package.
/// </summary>
public static class MetaEndpoints
{
    public static IEndpointRouteBuilder MapMetaEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/meta", () =>
        {
            var assembly = typeof(MetaEndpoints).Assembly;
            var version = assembly.GetName().Version?.ToString() ?? "0.0.0";
            var informational = assembly
                .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? version;
            var commit = (Environment.GetEnvironmentVariable("GITHUB_SHA")
                ?? Environment.GetEnvironmentVariable("GIT_COMMIT")
                ?? string.Empty).Trim();
            var buildDate = File.GetLastWriteTimeUtc(assembly.Location)
                .ToString("O", CultureInfo.InvariantCulture);

            return Results.Ok(new
            {
                version = informational,
                assemblyVersion = version,
                commit,
                buildDate,
            });
        });

        return endpoints;
    }
}
