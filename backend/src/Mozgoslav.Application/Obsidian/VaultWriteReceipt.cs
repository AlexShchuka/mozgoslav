namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.2 — structured outcome of a single vault write.
/// <see cref="Action"/> distinguishes "wrote a new file", "replaced an
/// existing file" (a backup lives at
/// <c>&lt;vault&gt;/.mozgoslav/bootstrap-backups/&lt;iso-date&gt;/&lt;relpath&gt;</c>),
/// "skipped because policy said so", and "backed up and left alone".
/// </summary>
public sealed record VaultWriteReceipt(
    string VaultRelativePath,
    string Sha256,
    long BytesWritten,
    VaultWriteAction Action);

/// <summary>Enumerates the terminal states for a single vault write.</summary>
public enum VaultWriteAction
{
    Created,
    Overwrote,
    Skipped,
    BackedUp,
}
