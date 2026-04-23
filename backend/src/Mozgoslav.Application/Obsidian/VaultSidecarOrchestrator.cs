using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.1 — state-machine reconciler. Accepts the desired vault state
/// (<see cref="VaultProvisioningSpec"/>), drives <see cref="IVaultDriver"/> +
/// <see cref="IPluginInstaller"/> in a fixed order, and returns the fresh
/// <see cref="VaultDiagnosticsReport"/>. Idempotent: running twice against a
/// converged vault reports zero writes and a green report.
/// </summary>
public sealed class VaultSidecarOrchestrator
{
    private readonly IVaultDriver _driver;
    private readonly IPluginInstaller _plugins;
    private readonly IVaultDiagnostics _diagnostics;
    private readonly IReadOnlyList<PluginInstallSpec> _pinnedPlugins;
    private readonly ILogger<VaultSidecarOrchestrator> _logger;

    public VaultSidecarOrchestrator(
        IVaultDriver driver,
        IPluginInstaller plugins,
        IVaultDiagnostics diagnostics,
        IReadOnlyList<PluginInstallSpec> pinnedPlugins,
        ILogger<VaultSidecarOrchestrator> logger)
    {
        _driver = driver;
        _plugins = plugins;
        _diagnostics = diagnostics;
        _pinnedPlugins = pinnedPlugins;
        _logger = logger;
    }

    /// <summary>Drives the idempotent apply → install → bootstrap → diagnose pipeline.</summary>
    public async Task<VaultDiagnosticsReport> ApplyAsync(VaultProvisioningSpec spec, CancellationToken ct)
    {
        _logger.LogInformation("Obsidian sidecar: applying {FileCount} bootstrap files to {Vault}",
            spec.Files.Count, spec.VaultRoot);

        foreach (var plugin in _pinnedPlugins)
        {
            ct.ThrowIfCancellationRequested();
            var pluginResult = await _plugins.InstallAsync(plugin, spec.VaultRoot, ct);
            _logger.LogInformation(
                "Obsidian plugin {Plugin} status={Status} written={Count}",
                pluginResult.PluginId, pluginResult.Status, pluginResult.WrittenFiles.Count);
        }

        await _driver.EnsureVaultPreparedAsync(spec, ct);
        return await _diagnostics.RunAsync(ct);
    }
}
