using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.Services;

/// <summary>
/// Cleans raw transcripts before they are handed to the LLM for semantic processing.
/// Current implementation runs the profile-configured filler cleanup; glossary and
/// LLM-based correction are extension points for later iterations.
/// </summary>
public sealed class CorrectionService
{
    public string Correct(string rawText, Profile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return string.Empty;
        }

        return FillerCleaner.Clean(rawText, profile.CleanupLevel);
    }
}
