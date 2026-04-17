using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

/// <summary>
/// ADR-007 §2.6 BC-025 — binds a vault folder to a PARA category. The
/// Obsidian apply-layout endpoint reads these mappings to (a) create the
/// PARA scaffolding on disk and (b) move already-exported notes into the
/// right bucket when a <see cref="VaultExportRule"/> points at one.
/// </summary>
public sealed record FolderMapping(
    Guid Id,
    string Alias,
    string VaultPath,
    ParaCategory Category);
