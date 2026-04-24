using System;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.Services;

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
