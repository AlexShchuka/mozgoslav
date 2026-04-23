using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Application.Obsidian;

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
