using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.8 — pinned-release plugin installer. Downloads assets over
/// HTTPS, verifies SHA-256 against the shipped pinned table, extracts into
/// <c>&lt;vault&gt;/.obsidian/plugins/&lt;id&gt;/</c>, patches
/// <c>community-plugins.json</c> atomically. Never writes an unverified byte.
/// </summary>
public interface IPluginInstaller
{
    Task<PluginInstallResult> InstallAsync(PluginInstallSpec spec, string vaultPath, CancellationToken ct);

    Task<PluginInstallResult> EnsureRemovedAsync(string pluginId, string vaultPath, CancellationToken ct);
}
