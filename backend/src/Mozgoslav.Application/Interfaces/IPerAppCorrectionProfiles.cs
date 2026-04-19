using System;
using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-004 R2 — per-app correction profiles.
///
/// <para>
/// When the dictation helper reports the focused app's bundle id at finalize
/// time, the session manager consults this port to see whether the transcript
/// should be massaged differently for that app. Typical use cases:
/// <list type="bullet">
///   <item>Slack / Teams — keep Markdown inline formatting untouched.</item>
///   <item>VS Code / Cursor — prefer snake_case identifiers and preserve
///   code fencing instead of prosifying.</item>
///   <item>Notion / Obsidian — keep heading hashes and callouts.</item>
/// </list>
/// Returning <see cref="PerAppCorrectionProfile.Empty"/> from a lookup means
/// "apply the default global polish prompt" and is the safe fallback.
/// </para>
/// </summary>
public interface IPerAppCorrectionProfiles
{
    /// <summary>
    /// Resolves the per-app profile for a given bundle id. Returns
    /// <see cref="PerAppCorrectionProfile.Empty"/> when the id is null, empty
    /// or has no registered override — callers can always use the result
    /// without null-checking further.
    /// </summary>
    PerAppCorrectionProfile Resolve(string? bundleId);
}

/// <summary>
/// Data portion of a per-app correction profile. Designed as a plain value
/// type so it can be serialized (settings UI, import/export) without extra
/// ceremony.
/// </summary>
/// <param name="BundleId">macOS bundle identifier this profile targets.</param>
/// <param name="SystemPromptSuffix">
/// Extra sentence(s) appended to the default LLM polish prompt. Kept small on
/// purpose — long overrides drift into "rewrite prompt" territory which ADR-004
/// explicitly reserves for full Profiles, not per-app tweaks.
/// </param>
/// <param name="Glossary">
/// Literal replacements applied before the LLM call — useful for proper nouns
/// and jargon that Whisper keeps mishearing in a given app.
/// </param>
public sealed record PerAppCorrectionProfile(
    string BundleId,
    string SystemPromptSuffix,
    IReadOnlyDictionary<string, string> Glossary)
{
    /// <summary>Neutral profile — no suffix, no glossary. Safe fallback.</summary>
    public static readonly PerAppCorrectionProfile Empty = new(
        BundleId: string.Empty,
        SystemPromptSuffix: string.Empty,
        Glossary: new Dictionary<string, string>(StringComparer.Ordinal));

    public bool IsEmpty =>
        string.IsNullOrEmpty(SystemPromptSuffix) && Glossary.Count == 0;
}
