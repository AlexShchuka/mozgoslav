using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public interface IVaultDriver
{
    Task EnsureVaultPreparedAsync(VaultProvisioningSpec spec, CancellationToken ct);

    Task<VaultWriteReceipt> WriteNoteAsync(VaultNoteWrite write, CancellationToken ct);

    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
}
