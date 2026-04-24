namespace Mozgoslav.Application.Obsidian;

public sealed record VaultNoteWrite(
    string VaultRelativePath,
    string Body);
