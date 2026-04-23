namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.9 — single record in the build-time bootstrap manifest.
/// Emitted by <c>GenerateObsidianBootstrapManifest</c> MSBuild target and
/// consumed by <see cref="IVaultBootstrapProvider"/>.
/// </summary>
public sealed record BootstrapManifestEntry(
    string VaultRelativePath,
    string EmbeddedResourceKey,
    string Sha256,
    WritePolicy WritePolicy);
