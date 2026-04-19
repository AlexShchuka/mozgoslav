using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Services;

/// <summary>
/// Renders a <see cref="ProcessedNote"/> as Markdown with YAML frontmatter, following
/// the output format from ADR-001 §7. Pure function — safe for unit tests.
/// <para>
/// T3 — when a non-empty segment list is supplied to
/// <see cref="Generate"/> and at least one segment has a
/// <see cref="TranscriptSegment.SpeakerLabel"/>, the <c>## Full Transcript</c>
/// section groups consecutive same-speaker segments and renders them as
/// <c>**Alice (mm:ss):**\n text\n\n</c>. Segments without a speaker label
/// are grouped under a neutral "Speaker" header only when they sit between
/// diarized segments; a fully-null-speaker transcript renders identically
/// to the legacy plain-text output (byte-for-byte).
/// </para>
/// </summary>
public static class MarkdownGenerator
{
    public static string Generate(
        ProcessedNote note,
        Profile profile,
        Recording recording,
        IReadOnlyList<TranscriptSegment>? transcriptSegments = null)
    {
        ArgumentNullException.ThrowIfNull(note);
        ArgumentNullException.ThrowIfNull(profile);
        ArgumentNullException.ThrowIfNull(recording);

        var body = new StringBuilder();
        AppendFrontmatter(body, note, profile, recording);
        AppendBody(body, note, transcriptSegments);
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

    private static void AppendBody(
        StringBuilder sb,
        ProcessedNote note,
        IReadOnlyList<TranscriptSegment>? transcriptSegments)
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
            if (HasAnySpeaker(transcriptSegments))
            {
                AppendSpeakerGroupedTranscript(sb, transcriptSegments!);
            }
            else
            {
                sb.AppendLine(note.FullTranscript);
            }
        }
    }

    private static bool HasAnySpeaker(IReadOnlyList<TranscriptSegment>? segments)
    {
        if (segments is null || segments.Count == 0)
        {
            return false;
        }
        foreach (var segment in segments)
        {
            if (!string.IsNullOrWhiteSpace(segment.SpeakerLabel))
            {
                return true;
            }
        }
        return false;
    }

    /// <summary>
    /// Renders the transcript as speaker-headed groups. Consecutive segments
    /// that share the same label (including null — rendered as "Speaker") are
    /// joined into a single block headed by <c>**Label (mm:ss):**</c> where
    /// mm:ss is the block's starting offset. The null-speaker policy: treat
    /// null as its own group so interleaved system-narration / single-speaker
    /// passages inside a diarized recording get their own header rather than
    /// being silently absorbed into the previous speaker.
    /// </summary>
    private static void AppendSpeakerGroupedTranscript(
        StringBuilder sb,
        IReadOnlyList<TranscriptSegment> segments)
    {
        const string UnknownLabel = "Speaker";

        var groupStart = 0;
        for (var i = 1; i <= segments.Count; i++)
        {
            var prevLabel = NormalizeLabel(segments[groupStart].SpeakerLabel);
            var currentLabel = i < segments.Count
                ? NormalizeLabel(segments[i].SpeakerLabel)
                : null;

            if (i < segments.Count && string.Equals(prevLabel, currentLabel, StringComparison.Ordinal))
            {
                continue;
            }

            var header = prevLabel ?? UnknownLabel;
            var groupStartTime = segments[groupStart].Start;
            sb.Append("**")
                .Append(header)
                .Append(" (")
                .Append(FormatTimestamp(groupStartTime))
                .Append("):**")
                .AppendLine();
            sb.AppendLine();

            var block = new StringBuilder();
            for (var j = groupStart; j < i; j++)
            {
                if (block.Length > 0) block.Append(' ');
                block.Append(segments[j].Text.Trim());
            }
            sb.AppendLine(block.ToString());
            sb.AppendLine();

            groupStart = i;
        }
    }

    private static string? NormalizeLabel(string? label) =>
        string.IsNullOrWhiteSpace(label) ? null : label.Trim();

    private static string FormatTimestamp(TimeSpan offset)
    {
        var totalMinutes = (int)offset.TotalMinutes;
        var seconds = offset.Seconds;
        return $"{totalMinutes:D2}:{seconds:D2}";
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
