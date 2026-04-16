using System.Globalization;
using System.Text;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Services;

/// <summary>
/// Renders a <see cref="ProcessedNote"/> as Markdown with YAML frontmatter, following
/// the output format from ADR-001 §7. Pure function — safe for unit tests.
/// </summary>
public static class MarkdownGenerator
{
    public static string Generate(ProcessedNote note, Profile profile, Recording recording)
    {
        ArgumentNullException.ThrowIfNull(note);
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(recording);

        var body = new StringBuilder();
        AppendFrontmatter(body, note, profile, recording);
        AppendBody(body, note);
        return body.ToString();
    }

    private static void AppendFrontmatter(StringBuilder sb, ProcessedNote note, Profile profile, Recording recording)
    {
        sb.AppendLine("---");
        sb.AppendLine("type: conversation");
        sb.Append("profile: ").AppendLine(profile.Name.ToLowerInvariant());
        sb.Append("date: ").AppendLine(recording.CreatedAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        sb.Append("duration: \"").Append(recording.Duration.ToString(@"hh\:mm\:ss", CultureInfo.InvariantCulture)).AppendLine("\"");
        sb.Append("topic: ").AppendLine(Quote(note.Topic));
        sb.Append("conversation_type: ").AppendLine(note.ConversationType.ToString().ToLowerInvariant());

        if (note.Participants.Count > 0)
        {
            sb.Append("participants: ").AppendLine(YamlList(note.Participants));
        }

        var allTags = note.Tags.Concat(profile.AutoTags).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (allTags.Count > 0)
        {
            sb.Append("tags: ").AppendLine(YamlList(allTags));
        }

        sb.Append("source_audio: ").AppendLine(Quote(recording.FileName));
        sb.Append("processing_version: ").AppendLine(note.Version.ToString(CultureInfo.InvariantCulture));
        sb.AppendLine("---");
        sb.AppendLine();
    }

    private static void AppendBody(StringBuilder sb, ProcessedNote note)
    {
        if (!string.IsNullOrWhiteSpace(note.Summary))
        {
            sb.AppendLine("## Summary");
            sb.AppendLine(note.Summary);
            sb.AppendLine();
        }

        AppendBulletSection(sb, "Ключевые тезисы", note.KeyPoints);
        AppendBulletSection(sb, "Решения", note.Decisions);

        if (note.ActionItems.Count > 0)
        {
            sb.AppendLine("## Action Items");
            foreach (var item in note.ActionItems)
            {
                var deadline = string.IsNullOrWhiteSpace(item.Deadline) ? string.Empty : $" (дедлайн {item.Deadline})";
                sb.Append("- ").Append(item.Person).Append(": ").Append(item.Task).AppendLine(deadline);
            }
            sb.AppendLine();
        }

        AppendBulletSection(sb, "Вопросы без ответа", note.UnresolvedQuestions);

        if (note.Participants.Count > 0)
        {
            sb.AppendLine("## Участники");
            foreach (var p in note.Participants)
            {
                sb.Append("- [[").Append(p).AppendLine("]]");
            }
            sb.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(note.CleanTranscript))
        {
            sb.AppendLine("## Clean Transcript");
            sb.AppendLine(note.CleanTranscript);
            sb.AppendLine();
        }

        if (!string.IsNullOrWhiteSpace(note.FullTranscript))
        {
            sb.AppendLine("## Full Transcript");
            sb.AppendLine(note.FullTranscript);
        }
    }

    private static void AppendBulletSection(StringBuilder sb, string heading, IReadOnlyList<string> items)
    {
        if (items.Count == 0)
        {
            return;
        }
        sb.Append("## ").AppendLine(heading);
        foreach (var item in items)
        {
            sb.Append("- ").AppendLine(item);
        }
        sb.AppendLine();
    }

    private static string Quote(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return "\"\"";
        }
        return $"\"{value.Replace("\"", "\\\"", StringComparison.Ordinal)}\"";
    }

    private static string YamlList(IReadOnlyList<string> items)
    {
        var rendered = items.Select(i =>
            i.Contains(',', StringComparison.Ordinal) || i.Contains('"', StringComparison.Ordinal)
                ? Quote(i)
                : i);
        return "[" + string.Join(", ", rendered) + "]";
    }
}
