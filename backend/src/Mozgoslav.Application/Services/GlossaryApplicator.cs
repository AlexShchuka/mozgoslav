using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Services;

/// <summary>
/// Pure helper that projects a <see cref="Profile"/>'s glossary into the two
/// downstream consumers described in plan v0.8 Block 5 §2.1:
/// <list type="bullet">
///   <item><see cref="TryBuildInitialPrompt"/> — comma-joined terms fed to
///         Whisper.net as <c>initial_prompt</c> so the decoder biases toward
///         known proper nouns.</item>
///   <item><see cref="TryBuildLlmSystemPromptSuffix"/> — a one-liner appended
///         to the summarisation LLM system prompt telling the model to
///         preserve spelling verbatim.</item>
/// </list>
/// Both methods return <c>null</c> when the glossary is empty so callers can
/// cheaply test and skip the feature for profiles that do not use it.
/// </summary>
public sealed class GlossaryApplicator
{
    private const int MaxInitialPromptChars = 200;

    /// <summary>
    /// Build the Whisper.net <c>initial_prompt</c> string. Terms are joined
    /// with <c>", "</c> and truncated to <see cref="MaxInitialPromptChars"/>
    /// so the token-budget guidance from OpenAI (≤224 tokens ≈ 1000 chars)
    /// stays well within the safe range.
    /// </summary>
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

    /// <summary>
    /// Build the one-line suffix appended to the summarisation LLM system
    /// prompt. Empty glossary → <c>null</c>, keep the prompt unchanged.
    /// </summary>
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
