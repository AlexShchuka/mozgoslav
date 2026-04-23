namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.2 — single note-body write into the vault. The body is
/// pre-rendered markdown; frontmatter is part of <see cref="Body"/>. The
/// relative path is vault-root-relative and MUST use forward slashes.
/// </summary>
public sealed record VaultNoteWrite(
    string VaultRelativePath,
    string Body);
