using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IObsidianRestClient
{
    Task<bool> IsReachableAsync(CancellationToken ct);

    Task<ObsidianVaultInfo> GetVaultInfoAsync(CancellationToken ct);

    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
}

public sealed record ObsidianVaultInfo(string Name, string Path, string Version);
