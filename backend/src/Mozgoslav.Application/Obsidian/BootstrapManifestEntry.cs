namespace Mozgoslav.Application.Obsidian;

public sealed record BootstrapManifestEntry(
    string VaultRelativePath,
    string EmbeddedResourceKey,
    string Sha256,
    WritePolicy WritePolicy);
