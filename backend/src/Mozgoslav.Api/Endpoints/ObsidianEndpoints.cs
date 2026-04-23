using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.Endpoints;

public static class ObsidianEndpoints
{
    public sealed record SetupRequest(string? VaultPath);

    public sealed record OpenNoteRequest(string Path);

    public static IEndpointRouteBuilder MapObsidianEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/obsidian/setup", async (
            SetupRequest request,
            ObsidianSetupService service,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var target = string.IsNullOrWhiteSpace(request.VaultPath) ? settings.VaultPath : request.VaultPath;
            if (string.IsNullOrWhiteSpace(target))
            {
                return Results.BadRequest(new { error = "Vault path is not configured" });
            }

            try
            {
                var report = await service.SetupAsync(target, ct);
                if (string.IsNullOrWhiteSpace(settings.VaultPath))
                {
                    await settings.SaveAsync(settings.Snapshot with { VaultPath = target }, ct);
                }
                return Results.Ok(report);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/obsidian/export-all", async (
            IObsidianExportService service,
            IAppSettings settings,
            IVaultDiagnostics diagnostics,
            CancellationToken ct) =>
        {
            if (!settings.ObsidianFeatureEnabled)
            {
                return FeatureDisabledResult();
            }
            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                return BadRequestWithActions("vault-not-configured",
                    "Open Settings → Obsidian and run the first-run wizard.",
                    [DiagnosticAction.OpenOnboarding]);
            }
            var report = await diagnostics.RunAsync(ct);
            var missingPlugins = report.Plugins.Where(p => !p.Ok && !p.Optional).ToList();
            if (missingPlugins.Count > 0)
            {
                return BadRequestWithActions("plugins-missing",
                    $"{missingPlugins.Count} Obsidian plugin(s) are missing or disabled — run 'Reinstall plugins' before exporting.",
                    [DiagnosticAction.ReinstallPlugins]);
            }
            try
            {
                var result = await service.ExportAllUnexportedAsync(ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequestWithActions("export-failed", ex.Message, [DiagnosticAction.OpenOnboarding]);
            }
        });

        endpoints.MapPost("/api/obsidian/apply-layout", async (
            IObsidianLayoutService service,
            CancellationToken ct) =>
        {
            try
            {
                var result = await service.ApplyParaLayoutAsync(ct);
                return Results.Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapGet("/api/obsidian/rest-health", async (
            IObsidianRestClient client,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var host = settings.ObsidianApiHost;
            var reachable = await client.IsReachableAsync(ct);
            if (!reachable)
            {
                return Results.Ok(new
                {
                    reachable = false,
                    host,
                    version = (string?)null,
                    diagnostic = string.IsNullOrWhiteSpace(settings.ObsidianApiToken)
                        ? "Token is empty — fill in Settings → Obsidian to enable REST."
                        : "Plugin unreachable or token invalid.",
                });
            }
            try
            {
                var info = await client.GetVaultInfoAsync(ct);
                return Results.Ok(new
                {
                    reachable = true,
                    host,
                    version = info.Version,
                    diagnostic = "Connected.",
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new { reachable = false, host, version = (string?)null, diagnostic = ex.Message });
            }
        });

        endpoints.MapPost("/api/obsidian/open", async (
            OpenNoteRequest request,
            IObsidianRestClient client,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Path))
            {
                return Results.BadRequest(new { error = "path is required" });
            }
            if (await client.IsReachableAsync(ct))
            {
                try
                {
                    await client.OpenNoteAsync(request.Path, ct);
                    return Results.Ok(new { opened = true, via = "rest" });
                }
                catch (Exception)
                {
                }
            }
            var vault = settings.VaultPath;
            if (string.IsNullOrWhiteSpace(vault))
            {
                return Results.BadRequest(new { error = "Vault path is not configured and REST is unreachable." });
            }
            var absolute = Path.Combine(vault, request.Path);
            if (!File.Exists(absolute))
            {
                return Results.NotFound(new { error = $"Note not found: {absolute}" });
            }
            return Results.Ok(new { opened = true, via = "file", path = absolute });
        });

        endpoints.MapGet("/api/obsidian/detect", () =>
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string[] candidates =
            [
                Path.Combine(home, "Documents", "Obsidian Vault"),
                Path.Combine(home, "Obsidian"),
                Path.Combine(home, "Documents", "Obsidian"),
            ];
            var matches = candidates
                .Where(Directory.Exists)
                .Where(p => Directory.Exists(Path.Combine(p, ".obsidian")))
                .Select(p => new { path = p, name = Path.GetFileName(p) })
                .ToList();
            return Results.Ok(new { detected = matches, searched = candidates });
        });

        endpoints.MapGet("/api/obsidian/diagnostics", async (
            IVaultDiagnostics diagnostics,
            CancellationToken ct) =>
        {
            var report = await diagnostics.RunAsync(ct);
            return Results.Ok(report);
        });

        endpoints.MapPost("/api/obsidian/reapply-bootstrap", async (
            IAppSettings settings,
            IVaultDriver driver,
            IVaultBootstrapProvider bootstrap,
            IVaultDiagnostics diagnostics,
            CancellationToken ct) =>
        {
            if (!settings.ObsidianFeatureEnabled)
            {
                return FeatureDisabledResult();
            }
            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                return BadRequestWithActions("vault-not-configured",
                    "Open Settings → Obsidian and run the first-run wizard.",
                    [DiagnosticAction.OpenOnboarding]);
            }
            var spec = BuildProvisioningSpec(settings.VaultPath, bootstrap);
            await driver.EnsureVaultPreparedAsync(spec, ct);
            var report = await diagnostics.RunAsync(ct);
            return Results.Ok(new { report });
        });

        endpoints.MapPost("/api/obsidian/reinstall-plugins", async (
            IAppSettings settings,
            IPluginInstaller installer,
            IReadOnlyList<PluginInstallSpec> pinnedPlugins,
            IVaultDiagnostics diagnostics,
            CancellationToken ct) =>
        {
            if (!settings.ObsidianFeatureEnabled)
            {
                return FeatureDisabledResult();
            }
            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                return BadRequestWithActions("vault-not-configured",
                    "Open Settings → Obsidian and run the first-run wizard.",
                    [DiagnosticAction.OpenOnboarding]);
            }
            var results = new List<PluginInstallResult>(pinnedPlugins.Count);
            foreach (var plugin in pinnedPlugins)
            {
                ct.ThrowIfCancellationRequested();
                results.Add(await installer.InstallAsync(plugin, settings.VaultPath, ct));
            }
            var report = await diagnostics.RunAsync(ct);
            return Results.Ok(new { plugins = results, report });
        });

        return endpoints;
    }

    private static IResult BadRequestWithActions(string error, string hint, IReadOnlyList<DiagnosticAction> actions)
    {
        return Results.BadRequest(new { error, hint, actions });
    }

    private static IResult FeatureDisabledResult()
    {
        return Results.Json(
            new { error = "obsidian-feature-disabled", hint = "Enable the Obsidian feature in Settings before calling this endpoint.", actions = new[] { DiagnosticAction.OpenSettings } },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    private static VaultProvisioningSpec BuildProvisioningSpec(string vaultRoot, IVaultBootstrapProvider bootstrap)
    {
        var files = new List<BootstrapFileSpec>(bootstrap.Manifest.Count);
        foreach (var entry in bootstrap.Manifest)
        {
            files.Add(new BootstrapFileSpec(
                entry.VaultRelativePath, entry.EmbeddedResourceKey, entry.WritePolicy, entry.Sha256));
        }
        return new VaultProvisioningSpec(vaultRoot, files);
    }
}
