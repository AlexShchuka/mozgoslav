using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public sealed class VaultDiagnosticsService : IVaultDiagnostics
{
    private static readonly TimeSpan ExternalProbeTimeout = TimeSpan.FromSeconds(2);
    private static readonly JsonSerializerOptions DiagnosticsJson = new(JsonSerializerDefaults.Web);
    private const string TemplaterExpectedTemplatesFolder = "_system/templates";
    private const string TemplaterExpectedScriptsFolder = "_system/scripts";

    private readonly IAppSettings _settings;
    private readonly IVaultBootstrapProvider _bootstrap;
    private readonly IObsidianRestClient _rest;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IReadOnlyList<PluginInstallSpec> _pinnedPlugins;

    public VaultDiagnosticsService(
        IAppSettings settings,
        IVaultBootstrapProvider bootstrap,
        IObsidianRestClient rest,
        IHttpClientFactory httpClientFactory,
        IReadOnlyList<PluginInstallSpec> pinnedPlugins)
    {
        _settings = settings;
        _bootstrap = bootstrap;
        _rest = rest;
        _httpClientFactory = httpClientFactory;
        _pinnedPlugins = pinnedPlugins;
    }

    public async Task<VaultDiagnosticsReport> RunAsync(CancellationToken ct)
    {
        var vault = CheckVault();
        var plugins = vault.Ok ? await CheckPluginsAsync(vault.VaultPath, ct) : PluginChecksForMissingVault();
        var templater = vault.Ok ? CheckTemplater(vault.VaultPath) : TemplaterCheckForMissingVault();
        var bootstrap = vault.Ok ? await CheckBootstrapAsync(vault.VaultPath, ct) : BootstrapCheckForMissingVault();
        var rest = await CheckRestAsync(ct);
        var lmStudio = await CheckLmStudioAsync(ct);
        return new VaultDiagnosticsReport(
            SnapshotId: Guid.NewGuid(),
            Vault: vault,
            Plugins: plugins,
            Templater: templater,
            Bootstrap: bootstrap,
            RestApi: rest,
            LmStudio: lmStudio,
            GeneratedAt: DateTimeOffset.UtcNow);
    }

    private VaultPathCheck CheckVault()
    {
        var path = _settings.VaultPath;
        if (string.IsNullOrWhiteSpace(path))
        {
            return new VaultPathCheck(false, CheckSeverity.Error, "vault-not-configured",
                "Vault path is not configured.", [DiagnosticAction.OpenOnboarding], string.Empty);
        }
        if (!Directory.Exists(path))
        {
            return new VaultPathCheck(false, CheckSeverity.Error, "vault-path-missing",
                $"Vault path does not exist: {path}", [DiagnosticAction.OpenOnboarding], path);
        }
        if (!Directory.Exists(Path.Combine(path, ".obsidian")))
        {
            return new VaultPathCheck(false, CheckSeverity.Warning, "obsidian-dir-missing",
                "Folder exists but is not an Obsidian vault (no .obsidian/).",
                [DiagnosticAction.OpenOnboarding], path);
        }
        return new VaultPathCheck(true, CheckSeverity.Ok, "vault-ok", "Vault is valid.", [], path);
    }

    private async Task<IReadOnlyList<PluginCheck>> CheckPluginsAsync(string vaultPath, CancellationToken ct)
    {
        var result = new List<PluginCheck>(_pinnedPlugins.Count);
        var communityIds = await ReadCommunityPluginsAsync(vaultPath, ct);
        foreach (var spec in _pinnedPlugins)
        {
            var pluginDir = Path.Combine(vaultPath, ".obsidian", "plugins", spec.Id);
            var installed = Directory.Exists(pluginDir);
            var enabled = communityIds.Contains(spec.Id);
            var hashMatches = installed && await PluginHashMatchesAsync(pluginDir, spec, ct);
            var installedVersion = installed ? await ReadInstalledVersionAsync(pluginDir, ct) : null;
            var severity = (installed, enabled, hashMatches) switch
            {
                (true, true, true) => CheckSeverity.Ok,
                (false, _, _) => CheckSeverity.Warning,
                (_, false, _) => CheckSeverity.Warning,
                _ => CheckSeverity.Error,
            };
            var message = (installed, enabled, hashMatches) switch
            {
                (false, _, _) => $"Plugin {spec.Id} is not installed.",
                (_, false, _) => $"Plugin {spec.Id} is installed but disabled in Obsidian.",
                (_, _, false) => $"Plugin {spec.Id} assets do not match pinned SHA-256.",
                _ => $"Plugin {spec.Id} is installed + enabled + hash-matched.",
            };
            IReadOnlyList<DiagnosticAction> actions = severity == CheckSeverity.Ok
                ? []
                : [DiagnosticAction.ReinstallPlugins];
            result.Add(new PluginCheck(
                PluginId: spec.Id,
                Installed: installed,
                Enabled: enabled,
                HashMatches: hashMatches,
                Optional: false,
                ExpectedVersion: spec.Tag,
                InstalledVersion: installedVersion,
                Severity: severity,
                Code: severity == CheckSeverity.Ok ? "plugin-ok" : "plugin-issue",
                Message: message,
                Actions: actions));
        }
        return result;
    }

    private IReadOnlyList<PluginCheck> PluginChecksForMissingVault()
    {
        var list = new List<PluginCheck>(_pinnedPlugins.Count);
        foreach (var p in _pinnedPlugins)
        {
            list.Add(new PluginCheck(
                p.Id, false, false, false, false, p.Tag, null,
                CheckSeverity.Warning, "vault-missing",
                "Vault not configured — plugin status unknown.",
                [DiagnosticAction.OpenOnboarding]));
        }
        return list;
    }

    private static TemplaterSettingsCheck CheckTemplater(string vaultPath)
    {
        var dataPath = Path.Combine(vaultPath, ".obsidian", "plugins", "templater-obsidian", "data.json");
        if (!File.Exists(dataPath))
        {
            return new TemplaterSettingsCheck(false, CheckSeverity.Warning, "templater-missing",
                "Templater settings file not found (plugin absent or never enabled).",
                [DiagnosticAction.ReinstallPlugins], null, null);
        }
        try
        {
            var text = File.ReadAllText(dataPath);
            var data = JsonSerializer.Deserialize<TemplaterDataDto>(text, DiagnosticsJson);
            var templatesFolder = data?.TemplatesFolder;
            var scriptsFolder = data?.UserScriptsFolder;
            var ok = string.Equals(templatesFolder, TemplaterExpectedTemplatesFolder, StringComparison.Ordinal)
                && string.Equals(scriptsFolder, TemplaterExpectedScriptsFolder, StringComparison.Ordinal);
            return new TemplaterSettingsCheck(
                Ok: ok,
                Severity: ok ? CheckSeverity.Ok : CheckSeverity.Warning,
                Code: ok ? "templater-ok" : "templater-drift",
                Message: ok
                    ? $"Templater configured to {TemplaterExpectedTemplatesFolder} + {TemplaterExpectedScriptsFolder}."
                    : "Templater folders do not match Mozgoslav preset.",
                Actions: ok ? [] : [DiagnosticAction.ReapplyBootstrap],
                TemplatesFolder: templatesFolder,
                UserScriptsFolder: scriptsFolder);
        }
        catch (JsonException ex)
        {
            return new TemplaterSettingsCheck(false, CheckSeverity.Error, "templater-data-unreadable",
                $"Failed to parse Templater data.json: {ex.Message}",
                [DiagnosticAction.ReapplyBootstrap], null, null);
        }
        catch (IOException ex)
        {
            return new TemplaterSettingsCheck(false, CheckSeverity.Error, "templater-io-error",
                $"Failed to read Templater data.json: {ex.Message}",
                [DiagnosticAction.ReapplyBootstrap], null, null);
        }
    }

    private static TemplaterSettingsCheck TemplaterCheckForMissingVault()
    {
        return new TemplaterSettingsCheck(false, CheckSeverity.Warning, "vault-missing",
            "Vault not configured — Templater status unknown.",
            [DiagnosticAction.OpenOnboarding], null, null);
    }

    private async Task<BootstrapDriftCheck> CheckBootstrapAsync(string vaultPath, CancellationToken ct)
    {
        var entries = _bootstrap.Manifest;
        var files = new List<BootstrapFileDrift>(entries.Count);
        var drifted = 0;
        foreach (var entry in entries)
        {
            ct.ThrowIfCancellationRequested();
            var absolute = Path.Combine(vaultPath, entry.VaultRelativePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(absolute))
            {
                files.Add(new BootstrapFileDrift(entry.VaultRelativePath, BootstrapDriftStatus.Missing, entry.Sha256, null));
                drifted++;
                continue;
            }
            var actualSha = await Sha256HexAsync(absolute, ct);
            if (entry.WritePolicy == WritePolicy.UserOwned)
            {
                files.Add(new BootstrapFileDrift(entry.VaultRelativePath, BootstrapDriftStatus.Ok, entry.Sha256, actualSha));
                continue;
            }
            if (string.Equals(actualSha, entry.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                files.Add(new BootstrapFileDrift(entry.VaultRelativePath, BootstrapDriftStatus.Ok, entry.Sha256, actualSha));
            }
            else
            {
                files.Add(new BootstrapFileDrift(entry.VaultRelativePath, BootstrapDriftStatus.Outdated, entry.Sha256, actualSha));
                drifted++;
            }
        }
        var ok = drifted == 0;
        return new BootstrapDriftCheck(
            Ok: ok,
            Severity: ok ? CheckSeverity.Ok : CheckSeverity.Warning,
            Code: ok ? "bootstrap-ok" : "bootstrap-drift",
            Message: ok
                ? "Bootstrap in sync with shipped manifest."
                : $"{drifted} bootstrap file(s) are missing or out of date.",
            Actions: ok ? [] : [DiagnosticAction.ReapplyBootstrap],
            Files: files);
    }

    private static BootstrapDriftCheck BootstrapCheckForMissingVault()
    {
        return new BootstrapDriftCheck(false, CheckSeverity.Warning, "vault-missing",
            "Vault not configured — bootstrap status unknown.",
            [DiagnosticAction.OpenOnboarding], []);
    }

    private async Task<RestApiCheck> CheckRestAsync(CancellationToken ct)
    {
        var host = _settings.ObsidianApiHost;
        var token = _settings.ObsidianApiToken;
        var required = !string.IsNullOrWhiteSpace(token);
        if (!required)
        {
            return new RestApiCheck(false, Required: false, CheckSeverity.Advisory, "rest-disabled",
                "Local REST API is disabled (no token configured).",
                [], host, null);
        }
        try
        {
            using var probeCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            probeCts.CancelAfter(ExternalProbeTimeout);
            if (!await _rest.IsReachableAsync(probeCts.Token))
            {
                return new RestApiCheck(false, Required: true, CheckSeverity.Warning, "rest-unreachable",
                    "Local REST API plugin is unreachable.",
                    [DiagnosticAction.RefreshRestToken, DiagnosticAction.ReinstallPlugins],
                    host, null);
            }
            var info = await _rest.GetVaultInfoAsync(probeCts.Token);
            return new RestApiCheck(true, Required: true, CheckSeverity.Ok, "rest-ok",
                "Local REST API is reachable.", [], host, info.Version);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return new RestApiCheck(false, Required: true, CheckSeverity.Warning, "rest-timeout",
                "Local REST API probe timed out.",
                [DiagnosticAction.RefreshRestToken], host, null);
        }
        catch (HttpRequestException ex)
        {
            return new RestApiCheck(false, Required: true, CheckSeverity.Warning, "rest-http-error",
                $"Local REST API probe failed: {ex.Message}",
                [DiagnosticAction.RefreshRestToken], host, null);
        }
    }

    private async Task<LmStudioCheck> CheckLmStudioAsync(CancellationToken ct)
    {
        var endpoint = _settings.LlmEndpoint;
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return new LmStudioCheck(false, CheckSeverity.Advisory, "llm-not-configured",
                "LM Studio / LLM endpoint not configured (optional for Obsidian).",
                [], null);
        }
        try
        {
            using var probeCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            probeCts.CancelAfter(ExternalProbeTimeout);
            using var client = _httpClientFactory.CreateClient(GitHubPluginInstaller.HttpClientName);
            using var response = await client.GetAsync(endpoint, probeCts.Token);
            var ok = response.IsSuccessStatusCode;
            return new LmStudioCheck(
                Ok: ok,
                Severity: ok ? CheckSeverity.Ok : CheckSeverity.Advisory,
                Code: ok ? "llm-ok" : "llm-unreachable",
                Message: ok ? "LLM endpoint reachable." : "LLM endpoint unreachable (advisory — does not gate Obsidian).",
                Actions: ok ? [] : [DiagnosticAction.OpenLmStudioHelp],
                Endpoint: endpoint);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            return new LmStudioCheck(false, CheckSeverity.Advisory, "llm-probe-failed",
                $"LLM probe failed: {ex.Message} (advisory).",
                [DiagnosticAction.OpenLmStudioHelp], endpoint);
        }
    }

    private static async Task<HashSet<string>> ReadCommunityPluginsAsync(string vaultPath, CancellationToken ct)
    {
        var file = Path.Combine(vaultPath, ".obsidian", "community-plugins.json");
        if (!File.Exists(file))
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }
        try
        {
            var text = await File.ReadAllTextAsync(file, ct);
            if (string.IsNullOrWhiteSpace(text))
            {
                return new HashSet<string>(StringComparer.Ordinal);
            }
            var ids = JsonSerializer.Deserialize<List<string>>(text, DiagnosticsJson);
            if (ids is null)
            {
                return new HashSet<string>(StringComparer.Ordinal);
            }
            return new HashSet<string>(ids, StringComparer.Ordinal);
        }
        catch (JsonException)
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }
        catch (IOException)
        {
            return new HashSet<string>(StringComparer.Ordinal);
        }
    }

    private static async Task<bool> PluginHashMatchesAsync(string pluginDir, PluginInstallSpec spec, CancellationToken ct)
    {
        foreach (var asset in spec.Assets)
        {
            var path = Path.Combine(pluginDir, asset.Dest);
            if (!File.Exists(path))
            {
                if (asset.Optional) continue;
                return false;
            }
            var bytes = await File.ReadAllBytesAsync(path, ct);
            var sha = Sha256Hex(bytes);
            if (!string.Equals(sha, asset.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }
        return true;
    }

    private static async Task<string?> ReadInstalledVersionAsync(string pluginDir, CancellationToken ct)
    {
        var manifestPath = Path.Combine(pluginDir, "manifest.json");
        if (!File.Exists(manifestPath))
        {
            return null;
        }
        try
        {
            var text = await File.ReadAllTextAsync(manifestPath, ct);
            var dto = JsonSerializer.Deserialize<PluginManifestDto>(text, DiagnosticsJson);
            return dto?.Version;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
    }

    private static async Task<string> Sha256HexAsync(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(stream, ct);
        return Sha256Hex(hash);
    }

    private static string Sha256Hex(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
        {
            sb.Append(b.ToString("X2", CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }

    private sealed record TemplaterDataDto(
        [property: JsonPropertyName("templates_folder")] string? TemplatesFolder,
        [property: JsonPropertyName("user_scripts_folder")] string? UserScriptsFolder);

    private sealed record PluginManifestDto(
        [property: JsonPropertyName("version")] string? Version);
}
