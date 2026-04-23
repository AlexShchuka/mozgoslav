using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.2 / G2 — sole write port into the Obsidian vault. Every
/// mutation (bootstrap files, per-note exports, folder scaffolding) passes
/// through here. No other class is allowed to call <c>File.*</c> against
/// paths under the configured vault root.
/// </summary>
public interface IVaultDriver
{
    /// <summary>Materialises the bootstrap tree per the provisioning spec. Idempotent.</summary>
    Task EnsureVaultPreparedAsync(VaultProvisioningSpec spec, CancellationToken ct);

    /// <summary>Writes a single note body to <paramref name="write"/>'s relative path.</summary>
    Task<VaultWriteReceipt> WriteNoteAsync(VaultNoteWrite write, CancellationToken ct);

    /// <summary>Idempotently ensures an empty folder exists under the vault root.</summary>
    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
}
