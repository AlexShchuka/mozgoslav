using System;
using System.Collections.Generic;
using System.Linq;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Services;

public sealed class GlossaryApplicator
{
    private const int MaxInitialPromptChars = 200;
    private const string DefaultLanguageKey = "default";

    public string? TryBuildInitialPrompt(Profile profile, string? language = null)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var terms = ResolveTerms(profile, language);
        if (terms.Count == 0)
        {
            return null;
        }
        var joined = string.Join(", ", terms);
        return joined.Length > MaxInitialPromptChars
            ? joined[..MaxInitialPromptChars]
            : joined;
    }

    public string? TryBuildLlmSystemPromptSuffix(Profile profile, string? language = null)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var terms = ResolveTerms(profile, language);
        if (terms.Count == 0)
        {
            return null;
        }
        return "Proper nouns to preserve verbatim: " + string.Join(", ", terms) + ".";
    }

    private static List<string> ResolveTerms(Profile profile, string? language)
    {
        var dict = profile.GlossaryByLanguage;
        if (dict is null || dict.Count == 0)
        {
            return [];
        }

        List<string>? raw = null;
        if (!string.IsNullOrWhiteSpace(language) && dict.TryGetValue(language, out var langTerms))
        {
            raw = langTerms;
        }
        else if (dict.TryGetValue(DefaultLanguageKey, out var defaultTerms))
        {
            raw = defaultTerms;
        }

        return Clean(raw);
    }

    private static List<string> Clean(IEnumerable<string>? glossary)
    {
        if (glossary is null)
        {
            return [];
        }
        return glossary
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }
}
