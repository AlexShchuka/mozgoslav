using System;
using System.Collections.Generic;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// ADR-004 R2 MVP adapter for <see cref="IPerAppCorrectionProfiles"/>.
///
/// <para>
/// Ships with a small, deliberately conservative set of built-in profiles for
/// the apps we expect users to dictate into most often on macOS. The full
/// end-user edit surface (a Profiles-style UI per bundle id, persisted to
/// SQLite) is a follow-up ADR; this class keeps the integration point in
/// place so the Swift helper's reported bundle id is not wasted while the UI
/// catches up.
/// </para>
/// </summary>
public sealed class InMemoryPerAppCorrectionProfiles : IPerAppCorrectionProfiles
{
    private readonly Dictionary<string, PerAppCorrectionProfile> _profiles;

    public InMemoryPerAppCorrectionProfiles()
    {
        _profiles = new Dictionary<string, PerAppCorrectionProfile>(StringComparer.Ordinal)
        {
            ["com.tinyspeck.slackmacgap"] = new(
                BundleId: "com.tinyspeck.slackmacgap",
                SystemPromptSuffix:
                    "Контекст: Slack-сообщение. Сохраняй инлайн-ссылки и `код в backticks`, " +
                    "не разворачивай аббревиатуры.",
                Glossary: Empty),
            ["com.microsoft.VSCode"] = new(
                BundleId: "com.microsoft.VSCode",
                SystemPromptSuffix:
                    "Контекст: VS Code. Сохраняй code fence, имена переменных в snake_case/camelCase как есть.",
                Glossary: Empty),
            ["md.obsidian"] = new(
                BundleId: "md.obsidian",
                SystemPromptSuffix:
                    "Контекст: Obsidian-заметка. Сохраняй Markdown-заголовки (# ## ###), wiki-links [[...]], callouts > [!note].",
                Glossary: Empty),
        };
    }

    public PerAppCorrectionProfile Resolve(string? bundleId)
    {
        if (string.IsNullOrWhiteSpace(bundleId))
        {
            return PerAppCorrectionProfile.Empty;
        }
        return _profiles.TryGetValue(bundleId, out var profile) ? profile : PerAppCorrectionProfile.Empty;
    }

    private static readonly IReadOnlyDictionary<string, string> Empty =
        new Dictionary<string, string>(StringComparer.Ordinal);
}
