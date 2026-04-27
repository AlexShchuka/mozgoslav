using System;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Obsidian;

public static class VaultPathPlanner
{
    private static readonly Regex InvalidFileChars = new(@"[\\/:*?""<>|]+", RegexOptions.Compiled);
    private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

    public static string ComputeRelativePath(ProcessedNote note, Profile profile)
    {
        ArgumentNullException.ThrowIfNull(note);
        ArgumentNullException.ThrowIfNull(profile);

        var exportFolder = string.IsNullOrWhiteSpace(profile.ExportFolder) ? "_inbox" : profile.ExportFolder;
        var date = note.CreatedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var topic = Sanitize(string.IsNullOrWhiteSpace(note.Topic) ? "conversation" : note.Topic);
        var profileSlug = Sanitize(profile.Name);
        var fileName = $"{date}-{topic}-{profileSlug}.md";
        return Path.Combine(exportFolder, fileName).Replace('\\', '/');
    }

    private static string Sanitize(string value)
    {
        var stripped = InvalidFileChars.Replace(value, "");
        var collapsed = Whitespace.Replace(stripped, "-").Trim('-');
        return collapsed.Length switch
        {
            0 => "note",
            > 80 => collapsed[..80].TrimEnd('-'),
            _ => collapsed
        };
    }
}
