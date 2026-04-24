using System;
using System.Collections.Generic;
using System.Linq;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Services;

public sealed class GlossaryApplicator
{
    private const int MaxInitialPromptChars = 200;

    public string? TryBuildInitialPrompt(Profile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var terms = Clean(profile.Glossary);
        if (terms.Count == 0)
        {
            return null;
        }
        var joined = string.Join(", ", terms);
        return joined.Length > MaxInitialPromptChars
            ? joined[..MaxInitialPromptChars]
            : joined;
    }

    public string? TryBuildLlmSystemPromptSuffix(Profile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var terms = Clean(profile.Glossary);
        if (terms.Count == 0)
        {
            return null;
        }
        return "Proper nouns to preserve verbatim: " + string.Join(", ", terms) + ".";
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
