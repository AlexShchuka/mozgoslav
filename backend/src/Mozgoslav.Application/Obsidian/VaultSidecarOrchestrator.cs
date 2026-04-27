using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Application.Obsidian;

public sealed class VaultSidecarOrchestrator
{
    private const string TemplaterPluginId = "templater-obsidian";
    private const string LocalRestApiPluginId = "obsidian-local-rest-api";
    private const string TemplaterTemplatesFolder = "_system/templates";
    private const string TemplaterScriptsFolder = "_system/scripts";

    private static readonly JsonSerializerOptions WizardJson = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly IVaultDriver _driver;
    private readonly IPluginInstaller _plugins;
    private readonly IVaultDiagnostics _diagnostics;
    private readonly IVaultBootstrapProvider _bootstrap;
    private readonly IAppSettings _settings;
    private readonly IReadOnlyList<PluginInstallSpec> _pinnedPlugins;
    private readonly ILogger<VaultSidecarOrchestrator> _logger;

    public VaultSidecarOrchestrator(
        IVaultDriver driver,
        IPluginInstaller plugins,
        IVaultDiagnostics diagnostics,
        IVaultBootstrapProvider bootstrap,
        IAppSettings settings,
        IReadOnlyList<PluginInstallSpec> pinnedPlugins,
        ILogger<VaultSidecarOrchestrator> logger)
    {
        _driver = driver;
        _plugins = plugins;
        _diagnostics = diagnostics;
        _bootstrap = bootstrap;
        _settings = settings;
        _pinnedPlugins = pinnedPlugins;
        _logger = logger;
    }

    public async Task<VaultSidecarApplyResult> ApplyAsync(VaultProvisioningSpec spec, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(spec);
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

        var receipt = await _driver.EnsureVaultPreparedAsync(spec, ct);
        await PreSeedTemplaterDataAsync(spec.VaultRoot, ct);
        var diagnostics = await _diagnostics.RunAsync(ct);
        return new VaultSidecarApplyResult(diagnostics, receipt);
    }

    public async Task<WizardStepResult> RunWizardStepAsync(int step, CancellationToken ct)
    {
        if (step < 1 || step > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(step), step, "Wizard step must be in range 1..5");
        }

        var vaultRoot = _settings.VaultPath;
        switch (step)
        {
            case 1:
                EnsureVaultLooksLikeObsidian(vaultRoot);
                break;
            case 2:
                RequireVaultRoot(vaultRoot);
                foreach (var plugin in _pinnedPlugins)
                {
                    ct.ThrowIfCancellationRequested();
                    await _plugins.InstallAsync(plugin, vaultRoot, ct);
                }
                break;
            case 3:
                RequireVaultRoot(vaultRoot);
                break;
            case 4:
                RequireVaultRoot(vaultRoot);
                await CaptureRestTokenAsync(vaultRoot, ct);
                break;
            case 5:
                RequireVaultRoot(vaultRoot);
                var spec = BuildSpec(vaultRoot);
                await _driver.EnsureVaultPreparedAsync(spec, ct);
                await PreSeedTemplaterDataAsync(vaultRoot, ct);
                break;
        }

        var diagnostics = await _diagnostics.RunAsync(ct);
        var nextStep = ComputeNextStep(step, diagnostics);
        return new WizardStepResult(step, nextStep, diagnostics);
    }

    public async Task<BootstrapReapplyResult> ReapplyBootstrapAsync(CancellationToken ct)
    {
        var vaultRoot = RequireVaultRoot(_settings.VaultPath);
        var spec = BuildSpec(vaultRoot);
        var receipt = await _driver.EnsureVaultPreparedAsync(spec, ct);
        await PreSeedTemplaterDataAsync(vaultRoot, ct);
        return new BootstrapReapplyResult(receipt.Overwritten, receipt.Skipped, receipt.BackedUpTo);
    }

    public async Task<PluginReinstallResult> ReinstallPluginsAsync(string vaultRoot, CancellationToken ct)
    {
        var root = RequireVaultRoot(vaultRoot);
        var reinstalled = new List<string>(_pinnedPlugins.Count);
        foreach (var plugin in _pinnedPlugins)
        {
            ct.ThrowIfCancellationRequested();
            await _plugins.EnsureRemovedAsync(plugin.Id, root, ct);
            await _plugins.InstallAsync(plugin, root, ct);
            reinstalled.Add(plugin.Id);
        }
        return new PluginReinstallResult(reinstalled);
    }

    private VaultProvisioningSpec BuildSpec(string vaultRoot)
    {
        var manifest = _bootstrap.Manifest;
        var files = new List<BootstrapFileSpec>(manifest.Count);
        foreach (var entry in manifest)
        {
            files.Add(new BootstrapFileSpec(
                entry.VaultRelativePath,
                entry.EmbeddedResourceKey,
                entry.WritePolicy,
                entry.Sha256));
        }
        return new VaultProvisioningSpec(vaultRoot, files);
    }

    private static void EnsureVaultLooksLikeObsidian(string vaultRoot)
    {
        RequireVaultRoot(vaultRoot);
        if (!Directory.Exists(vaultRoot))
        {
            throw new InvalidOperationException($"Vault path does not exist: {vaultRoot}");
        }
    }

    private static string RequireVaultRoot(string? vaultRoot)
    {
        if (string.IsNullOrWhiteSpace(vaultRoot))
        {
            throw new InvalidOperationException("Vault path is not configured");
        }
        return vaultRoot;
    }

    private async Task CaptureRestTokenAsync(string vaultRoot, CancellationToken ct)
    {
        var dataPath = Path.Combine(vaultRoot, ".obsidian", "plugins", LocalRestApiPluginId, "data.json");
        if (!File.Exists(dataPath))
        {
            _logger.LogInformation("Obsidian wizard: REST API data.json not found at {Path}", dataPath);
            return;
        }
        var text = await File.ReadAllTextAsync(dataPath, ct);
        using var document = JsonDocument.Parse(text);
        if (!document.RootElement.TryGetProperty("apiKey", out var apiKeyElement))
        {
            _logger.LogInformation("Obsidian wizard: REST API data.json has no apiKey field");
            return;
        }
        var token = apiKeyElement.GetString();
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogInformation("Obsidian wizard: REST API token is empty");
            return;
        }
        var snapshot = _settings.Snapshot;
        if (string.Equals(snapshot.ObsidianApiToken, token, StringComparison.Ordinal))
        {
            return;
        }
        await _settings.SaveAsync(snapshot with { ObsidianApiToken = token }, ct);
    }

    private static async Task PreSeedTemplaterDataAsync(string vaultRoot, CancellationToken ct)
    {
        var dataPath = Path.Combine(vaultRoot, ".obsidian", "plugins", TemplaterPluginId, "data.json");
        var directory = Path.GetDirectoryName(dataPath);
        if (string.IsNullOrEmpty(directory))
        {
            return;
        }
        Directory.CreateDirectory(directory);
        var payload = new TemplaterDataDto(
            TemplaterTemplatesFolder,
            TemplaterScriptsFolder,
            TriggerOnFileCreation: false,
            EnableSystemCommand: true,
            UserFunctionsEnabled: true);
        var json = JsonSerializer.Serialize(payload, WizardJson);
        var bytes = Encoding.UTF8.GetBytes(json);
        var temp = dataPath + ".tmp";
        await File.WriteAllBytesAsync(temp, bytes, ct);
        File.Move(temp, dataPath, overwrite: true);
    }

    private int? ComputeNextStep(int currentStep, VaultDiagnosticsReport diagnostics)
    {
        if (currentStep >= 5)
        {
            return null;
        }
        var stepStates = new bool[5];
        stepStates[0] = diagnostics.Vault.Ok;
        stepStates[1] = diagnostics.Plugins.All(p => p.Installed || p.Optional);
        stepStates[2] = diagnostics.Plugins.All(p => p.Enabled || p.Optional);
        stepStates[3] = !diagnostics.RestApi.Required || diagnostics.RestApi.Ok;
        stepStates[4] = diagnostics.Bootstrap.Ok && diagnostics.Templater.Ok;
        for (var i = 0; i < stepStates.Length; i++)
        {
            if (!stepStates[i])
            {
                return i + 1;
            }
        }
        return null;
    }

    private sealed record TemplaterDataDto(
        [property: JsonPropertyName("templates_folder")] string TemplatesFolder,
        [property: JsonPropertyName("user_scripts_folder")] string UserScriptsFolder,
        [property: JsonPropertyName("trigger_on_file_creation")] bool TriggerOnFileCreation,
        [property: JsonPropertyName("enable_system_command")] bool EnableSystemCommand,
        [property: JsonPropertyName("user_functions_enabled")] bool UserFunctionsEnabled);
}
