using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.UseCases;

public sealed class SuggestGlossaryTermsUseCase
{
    private const int TopN = 20;
    private const int MinTokenLength = 4;

    private static readonly HashSet<string> RuStopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "который", "которые", "когда", "потому", "сейчас", "может", "всего", "также", "между", "можно"
    };

    private static readonly HashSet<string> EnStopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "which", "that", "this", "with", "from", "have", "been", "were", "they", "there", "their", "will"
    };

    private readonly IProcessedNoteRepository _notes;
    private readonly IProfileRepository _profiles;

    public SuggestGlossaryTermsUseCase(
        IProcessedNoteRepository notes,
        IProfileRepository profiles)
    {
        _notes = notes;
        _profiles = profiles;
    }

    public async Task<IReadOnlyList<string>> ExecuteAsync(Guid profileId, string language, CancellationToken ct)
    {
        var profile = await _profiles.GetByIdAsync(profileId, ct);
        var recentNotes = await _notes.GetByProfileIdAsync(profileId, ct);

        var existing = CollectAllGlossaryTerms(profile);
        var stopwords = ResolveStopwords(language);

        var freq = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var note in recentNotes)
        {
            var text = note.CleanTranscript ?? string.Empty;
            if (string.IsNullOrWhiteSpace(text))
            {
                text = note.FullTranscript ?? string.Empty;
            }

            foreach (var token in Tokenize(text))
            {
                if (token.Length < MinTokenLength) continue;
                if (long.TryParse(token, out _)) continue;
                if (stopwords.Contains(token)) continue;
                if (existing.Contains(token)) continue;

                freq[token] = freq.TryGetValue(token, out var count) ? count + 1 : 1;
            }
        }

        return freq
            .OrderByDescending(kv => kv.Value)
            .Take(TopN)
            .Select(kv => kv.Key)
            .ToList();
    }

    private static HashSet<string> CollectAllGlossaryTerms(Profile? profile)
    {
        if (profile is null)
        {
            return [];
        }

        var all = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var terms in profile.GlossaryByLanguage.Values)
        {
            foreach (var term in terms)
            {
                all.Add(term);
            }
        }
        return all;
    }

    private static HashSet<string> ResolveStopwords(string language)
    {
        if (string.Equals(language, "ru", StringComparison.OrdinalIgnoreCase))
        {
            return RuStopwords;
        }
        if (string.Equals(language, "en", StringComparison.OrdinalIgnoreCase))
        {
            return EnStopwords;
        }
        return [];
    }

    private static IEnumerable<string> Tokenize(string text)
    {
        var start = -1;
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (char.IsLetterOrDigit(c) || c == '-' || c == '\'')
            {
                if (start < 0) start = i;
            }
            else
            {
                if (start >= 0)
                {
                    yield return text[start..i].ToLowerInvariant().Trim('-', '\'');
                    start = -1;
                }
            }
        }
        if (start >= 0)
        {
            yield return text[start..].ToLowerInvariant().Trim('-', '\'');
        }
    }
}
