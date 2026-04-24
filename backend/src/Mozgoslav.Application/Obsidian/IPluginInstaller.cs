using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public interface IPluginInstaller
{
    Task<PluginInstallResult> InstallAsync(PluginInstallSpec spec, string vaultPath, CancellationToken ct);

    Task<PluginInstallResult> EnsureRemovedAsync(string pluginId, string vaultPath, CancellationToken ct);
}
