namespace Mozgoslav.Api.Models;

/// <summary>
/// ADR-010 two-tier model distribution.
///
/// <list type="bullet">
///   <item><description><see cref="Bundle"/> — ships inside the DMG
///   (Tier 1). Download URL points at the pinned GitHub Release so a
///   dev build without the bundle can still fetch it.</description></item>
///   <item><description><see cref="Downloadable"/> — user-opt-in
///   (Tier 2). Too big for the DMG; the Models page / Onboarding wizard
///   triggers the fetch from the model's original hosting (HuggingFace).
///   </description></item>
/// </list>
/// </summary>
public enum ModelTier
{
    Bundle,
    Downloadable
}
