namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.2 — one entry in <see cref="VaultProvisioningSpec"/>.
/// Tells the <see cref="IVaultDriver"/> which embedded resource to emit at
/// <see cref="VaultRelativePath"/>, with which <see cref="WritePolicy"/>,
/// against which pre-computed <see cref="Sha256"/> baseline.
/// </summary>
public sealed record BootstrapFileSpec(
    string VaultRelativePath,
    string EmbeddedResourceKey,
    WritePolicy WritePolicy,
    string Sha256);
