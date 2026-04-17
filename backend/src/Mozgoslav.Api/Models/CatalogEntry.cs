namespace Mozgoslav.Api.Models;

/// <summary>
/// One entry in the app's model catalogue. Used by the Models page,
/// the Onboarding wizard and <see cref="ModelCatalog.TryGet"/>.
/// </summary>
/// <param name="Id">Stable catalogue identifier (kebab-case).</param>
/// <param name="Name">Human-facing title (localised in the UI layer).</param>
/// <param name="Description">One-line user-facing description.</param>
/// <param name="Url">
/// Canonical download URL. For <see cref="ModelTier.Bundle"/> entries it
/// points at the pinned GitHub Release asset; for
/// <see cref="ModelTier.Downloadable"/> it points at HuggingFace so the
/// user can verify the source.
/// </param>
/// <param name="SizeMb">File size on disk, mebibytes.</param>
/// <param name="Kind">Which pipeline stage the model serves.</param>
/// <param name="Tier">
/// ADR-010 distribution tier. Tier 1 ships inside the DMG; Tier 2 is
/// downloaded on demand.
/// </param>
/// <param name="IsDefault">
/// <c>true</c> when this entry is the recommended default for its
/// <see cref="ModelKind"/>. The Models page uses the flag to bold the
/// entry and pre-select it in the Onboarding wizard.
/// </param>
public sealed record CatalogEntry(
    string Id,
    string Name,
    string Description,
    string Url,
    int SizeMb,
    ModelKind Kind,
    ModelTier Tier,
    bool IsDefault);
