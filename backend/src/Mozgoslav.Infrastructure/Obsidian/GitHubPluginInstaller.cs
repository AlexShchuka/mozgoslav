using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public sealed class GitHubPluginInstaller : IPluginInstaller
{
    public const string HttpClientName = "Mozgoslav.ObsidianPluginInstaller";
    private const string DotObsidian = ".obsidian";
    private const string PluginsFolder = "plugins";
    private const string CommunityPluginsFile = "community-plugins.json";
    private const string ReleaseBaseUrl = "https://github.com";

    private static readonly JsonSerializerOptions CommunityPluginsJson = new() { WriteIndented = true };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GitHubPluginInstaller> _logger;

    public GitHubPluginInstaller(IHttpClientFactory httpClientFactory, ILogger<GitHubPluginInstaller> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<PluginInstallResult> InstallAsync(PluginInstallSpec spec, string vaultPath, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(spec);
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultPath);

        var pluginDir = Path.Combine(vaultPath, DotObsidian, PluginsFolder, spec.Id);
        if (await AssetsAlreadyMatchAsync(pluginDir, spec, ct))
        {
            await PatchCommunityPluginsAsync(vaultPath, spec.Id, enable: true, ct);
            var existing = spec.Assets.Select(a => Path.Combine(pluginDir, a.Dest)).ToList();
            return new PluginInstallResult(spec.Id, PluginInstallStatus.AlreadyInstalled, null, existing);
        }

        var stagingDir = Path.Combine(Path.GetTempPath(), $"mozgoslav-plugin-{spec.Id}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(stagingDir);
        try
        {
            foreach (var asset in spec.Assets)
            {
                ct.ThrowIfCancellationRequested();
                var downloaded = await TryDownloadAsync(spec, asset, ct);
                if (downloaded is null)
                {
                    if (asset.Optional)
                    {
                        continue;
                    }
                    _logger.LogWarning("Plugin {Plugin} asset {Asset} download failed", spec.Id, asset.Name);
                    return new PluginInstallResult(spec.Id, PluginInstallStatus.DownloadFailed,
                        $"Asset {asset.Name} download failed", []);
                }
                var actualSha = Sha256Hex(downloaded);
                if (!string.Equals(actualSha, asset.Sha256, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning(
                        "Plugin {Plugin} asset {Asset} SHA mismatch expected={Expected} actual={Actual}",
                        spec.Id, asset.Name, asset.Sha256, actualSha);
                    return new PluginInstallResult(spec.Id, PluginInstallStatus.HashMismatch,
                        $"Asset {asset.Name} hash mismatch", []);
                }
                var stagingPath = Path.Combine(stagingDir, asset.Dest);
                await File.WriteAllBytesAsync(stagingPath, downloaded, ct);
            }

            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(pluginDir)!);
                if (Directory.Exists(pluginDir))
                {
                    Directory.Delete(pluginDir, recursive: true);
                }
                Directory.Move(stagingDir, pluginDir);
            }
            catch (IOException ex)
            {
                _logger.LogError(ex, "Plugin {Plugin} directory swap failed", spec.Id);
                return new PluginInstallResult(spec.Id, PluginInstallStatus.WriteFailed, ex.Message, []);
            }

            await PatchCommunityPluginsAsync(vaultPath, spec.Id, enable: true, ct);

            var written = Directory.EnumerateFiles(pluginDir).ToList();
            _logger.LogInformation("Plugin {Plugin} installed: {Count} files", spec.Id, written.Count);
            return new PluginInstallResult(spec.Id, PluginInstallStatus.Installed, null, written);
        }
        finally
        {
            if (Directory.Exists(stagingDir))
            {
                try { Directory.Delete(stagingDir, recursive: true); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }
    }

    public async Task<PluginInstallResult> EnsureRemovedAsync(string pluginId, string vaultPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(pluginId);
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultPath);

        var pluginDir = Path.Combine(vaultPath, DotObsidian, PluginsFolder, pluginId);
        var existed = Directory.Exists(pluginDir);
        if (existed)
        {
            try
            {
                Directory.Delete(pluginDir, recursive: true);
            }
            catch (IOException ex)
            {
                return new PluginInstallResult(pluginId, PluginInstallStatus.WriteFailed, ex.Message, []);
            }
        }
        await PatchCommunityPluginsAsync(vaultPath, pluginId, enable: false, ct);
        return new PluginInstallResult(
            pluginId,
            existed ? PluginInstallStatus.Removed : PluginInstallStatus.NotInstalled,
            null,
            []);
    }

    private async Task<byte[]?> TryDownloadAsync(PluginInstallSpec spec, PluginAssetSpec asset, CancellationToken ct)
    {
        var url = $"{ReleaseBaseUrl}/{spec.Owner}/{spec.Repo}/releases/download/{spec.Tag}/{asset.Name}";
        try
        {
            using var client = _httpClientFactory.CreateClient(HttpClientName);
            using var response = await client.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }
            return await response.Content.ReadAsByteArrayAsync(ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (TaskCanceledException)
        {
            return null;
        }
    }

    private static async Task<bool> AssetsAlreadyMatchAsync(string pluginDir, PluginInstallSpec spec, CancellationToken ct)
    {
        if (!Directory.Exists(pluginDir))
        {
            return false;
        }
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

    private static async Task PatchCommunityPluginsAsync(string vaultPath, string pluginId, bool enable, CancellationToken ct)
    {
        var file = Path.Combine(vaultPath, DotObsidian, CommunityPluginsFile);
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        var ids = await ReadCommunityIdsAsync(file, ct);
        var contains = ids.Contains(pluginId);
        if (enable && !contains)
        {
            ids.Add(pluginId);
        }
        else if (!enable && contains)
        {
            ids.Remove(pluginId);
        }
        else
        {
            return;
        }

        var payload = JsonSerializer.Serialize(ids, CommunityPluginsJson);
        var temp = file + ".tmp";
        await File.WriteAllTextAsync(temp, payload, ct);
        File.Move(temp, file, overwrite: true);
    }

    private static async Task<List<string>> ReadCommunityIdsAsync(string file, CancellationToken ct)
    {
        if (!File.Exists(file))
        {
            return [];
        }
        var text = await File.ReadAllTextAsync(file, ct);
        if (string.IsNullOrWhiteSpace(text))
        {
            return [];
        }
        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(text, CommunityPluginsJson);
            return parsed ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Sha256Hex(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash)
        {
            sb.Append(b.ToString("X2", CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }
}
