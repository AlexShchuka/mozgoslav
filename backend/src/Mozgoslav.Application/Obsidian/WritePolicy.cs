namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.9 — classifies every shipped bootstrap file. The
/// <see cref="IVaultDriver"/> consults this to decide whether to overwrite
/// drifted files, create missing ones, or respect user edits.
/// </summary>
public enum WritePolicy
{
    /// <summary>Shipped artefact. Always overwrite on drift. Backup before write.</summary>
    Overwrite,
    /// <summary>Shipped seed. Create if absent; never overwrite user edits.</summary>
    CreateIfMissing,
    /// <summary>User-maintained. Create empty on first bootstrap; never touch afterwards.</summary>
    UserOwned,
}
