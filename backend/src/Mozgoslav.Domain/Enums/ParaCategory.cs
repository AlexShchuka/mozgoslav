namespace Mozgoslav.Domain.Enums;

/// <summary>
/// PARA methodology — Tiago Forte's "second-brain" categorisation. A
/// <see cref="Mozgoslav.Domain.Entities.FolderMapping"/> pins a vault folder
/// to one of these buckets so the Obsidian apply-layout endpoint knows where
/// to route exported notes (ADR-007 §2.6 BC-025).
/// </summary>
public enum ParaCategory
{
    /// <summary>Time-bound initiative with a deliverable.</summary>
    Project,

    /// <summary>Ongoing responsibility without a deadline.</summary>
    Area,

    /// <summary>Reference material for future use.</summary>
    Resource,

    /// <summary>Completed or abandoned projects/areas, kept for history.</summary>
    Archive,
}
