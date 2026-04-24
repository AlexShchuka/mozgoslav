namespace Mozgoslav.Application.Obsidian;

public sealed record BootstrapFileSpec(
    string VaultRelativePath,
    string EmbeddedResourceKey,
    WritePolicy WritePolicy,
    string Sha256);
