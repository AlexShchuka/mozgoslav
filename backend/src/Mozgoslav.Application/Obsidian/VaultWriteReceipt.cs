namespace Mozgoslav.Application.Obsidian;

public sealed record VaultWriteReceipt(
    string VaultRelativePath,
    string Sha256,
    long BytesWritten,
    VaultWriteAction Action);

public enum VaultWriteAction
{
    Created,
    Overwrote,
    Skipped,
    BackedUp,
}
