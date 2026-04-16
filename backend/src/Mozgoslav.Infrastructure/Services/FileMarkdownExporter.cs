using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Writes a <see cref="ProcessedNote"/> as a Markdown file inside the Obsidian vault.
/// The filename is <c>{date}-{topic}-{profile}.md</c>, with a numeric suffix when a
/// file with the same name already exists (so reprocess runs never overwrite older
/// notes silently).
/// </summary>
public sealed class FileMarkdownExporter : IMarkdownExporter
{
    private static readonly Regex InvalidFileChars = new(@"[\\/:*?""<>|]+", RegexOptions.Compiled);
    private static readonly Regex Whitespace = new(@"\s+", RegexOptions.Compiled);

    private readonly ILogger<FileMarkdownExporter> _logger;

    public FileMarkdownExporter(ILogger<FileMarkdownExporter> logger)
    {
        _logger = logger;
    }

    public async Task<string> ExportAsync(ProcessedNote note, Profile profile, string vaultPath, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(note);
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultPath);

        var exportFolder = string.IsNullOrWhiteSpace(profile.ExportFolder) ? "_inbox" : profile.ExportFolder;
        var targetDir = Path.Combine(vaultPath, exportFolder);
        Directory.CreateDirectory(targetDir);

        var fileName = BuildFileName(note, profile);
        var fullPath = DeduplicatePath(Path.Combine(targetDir, fileName));

        await File.WriteAllTextAsync(fullPath, note.MarkdownContent, Encoding.UTF8, ct);
        _logger.LogInformation("Exported note {NoteId} → {Path}", note.Id, fullPath);

        return fullPath;
    }

    private static string BuildFileName(ProcessedNote note, Profile profile)
    {
        var date = note.CreatedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var topic = Sanitize(string.IsNullOrWhiteSpace(note.Topic) ? "conversation" : note.Topic);
        var profileSlug = Sanitize(profile.Name);
        return $"{date}-{topic}-{profileSlug}.md";
    }

    private static string Sanitize(string value)
    {
        var stripped = InvalidFileChars.Replace(value, "");
        var collapsed = Whitespace.Replace(stripped, "-").Trim('-');
        return collapsed.Length switch
        {
            0 => "note",
            > 80 => collapsed[..80].TrimEnd('-'),
            _ => collapsed,
        };
    }

    private static string DeduplicatePath(string candidate)
    {
        if (!File.Exists(candidate))
        {
            return candidate;
        }

        var dir = Path.GetDirectoryName(candidate) ?? string.Empty;
        var stem = Path.GetFileNameWithoutExtension(candidate);
        var ext = Path.GetExtension(candidate);

        for (var i = 2; i < 1000; i++)
        {
            var attempt = Path.Combine(dir, $"{stem}-{i}{ext}");
            if (!File.Exists(attempt))
            {
                return attempt;
            }
        }
        throw new InvalidOperationException($"Could not find a free filename near {candidate}");
    }
}
