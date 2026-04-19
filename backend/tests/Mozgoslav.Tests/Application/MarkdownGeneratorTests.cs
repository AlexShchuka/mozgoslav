using System;
using System.Collections.Generic;

using FluentAssertions;

using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class MarkdownGeneratorTests
{
    [TestMethod]
    public void Generate_IncludesFrontmatterAndSummary()
    {
        var profile = new Profile { Name = "Work", CleanupLevel = CleanupLevel.Aggressive, AutoTags = ["meeting"] };
        var recording = new Recording
        {
            FileName = "meeting.m4a",
            Duration = TimeSpan.FromMinutes(42),
            CreatedAt = new DateTime(2026, 04, 16, 10, 0, 0, DateTimeKind.Utc)
        };
        var note = new ProcessedNote
        {
            Summary = "Обсудили релиз",
            KeyPoints = ["Дедлайн — пятница"],
            Decisions = ["Выпускаем в четверг"],
            ActionItems = [new ActionItem("Иван", "подготовить CHANGELOG", "четверг")],
            Participants = ["Иван", "Ольга"],
            Topic = "Релиз Q2",
            ConversationType = ConversationType.Meeting,
            Tags = ["release"],
            CleanTranscript = "clean",
            FullTranscript = "raw"
        };

        var markdown = MarkdownGenerator.Generate(note, profile, recording);

        markdown.Should().StartWith("---\n");
        markdown.Should().Contain("topic: \"Релиз Q2\"");
        markdown.Should().Contain("conversation_type: meeting");
        markdown.Should().Contain("## Summary");
        markdown.Should().Contain("Обсудили релиз");
        markdown.Should().Contain("## Ключевые тезисы");
        markdown.Should().Contain("## Решения");
        markdown.Should().Contain("- Иван: подготовить CHANGELOG (дедлайн четверг)");
        markdown.Should().Contain("[[Иван]]");
        markdown.Should().Contain("[[Ольга]]");
    }

    [TestMethod]
    public void Generate_EmptySections_AreOmitted()
    {
        var profile = new Profile { Name = "Personal" };
        var recording = new Recording { FileName = "a.m4a", CreatedAt = DateTime.UtcNow };
        var note = new ProcessedNote { Topic = "Idea", Summary = "brief", CleanTranscript = "" };

        var markdown = MarkdownGenerator.Generate(note, profile, recording);

        markdown.Should().Contain("## Summary");
        markdown.Should().NotContain("## Action Items");
        markdown.Should().NotContain("## Решения");
        markdown.Should().NotContain("## Clean Transcript");
    }

    [TestMethod]
    public void Generate_MergesAutoTagsWithNoteTags_Unique()
    {
        var profile = new Profile { Name = "Work", AutoTags = ["meeting", "work"] };
        var recording = new Recording { FileName = "a.m4a", CreatedAt = DateTime.UtcNow };
        var note = new ProcessedNote { Topic = "T", Tags = ["work", "q2"] };

        var markdown = MarkdownGenerator.Generate(note, profile, recording);

        markdown.Should().Contain("tags: [work, q2, meeting]");
    }

    [TestMethod]
    public void Generate_WithoutSegments_FullTranscriptRenderedPlain()
    {
        var (note, profile, recording) = BuildTranscriptNote("raw plain text");

        var markdown = MarkdownGenerator.Generate(note, profile, recording);

        markdown.Should().Contain("## Full Transcript");
        markdown.Should().Contain("raw plain text");
        markdown.Should().NotContain("**Speaker", "no diarization means no speaker headers");
    }

    [TestMethod]
    public void Generate_WithSegmentsButNoSpeakerLabels_RendersByteIdenticalLegacyOutput()
    {
        var (note, profile, recording) = BuildTranscriptNote("neutral");
        IReadOnlyList<TranscriptSegment> segments =
        [
            new TranscriptSegment(TimeSpan.Zero, TimeSpan.FromSeconds(2), "neutral"),
        ];

        var legacy = MarkdownGenerator.Generate(note, profile, recording);
        var withSegments = MarkdownGenerator.Generate(note, profile, recording, segments);

        withSegments.Should().Be(legacy,
            "T3 — segments without any speaker label MUST NOT change the rendered output");
    }

    [TestMethod]
    public void Generate_WithSpeakerLabels_GroupsBySpeakerWithTimestampHeaders()
    {
        var (note, profile, recording) = BuildTranscriptNote("Привет. Здравствуйте, как дела?");
        IReadOnlyList<TranscriptSegment> segments =
        [
            new TranscriptSegment(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(5), "Привет.", SpeakerLabel: "Alice"),
            new TranscriptSegment(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(7), "Здравствуйте,", SpeakerLabel: "Bob"),
            new TranscriptSegment(TimeSpan.FromSeconds(7), TimeSpan.FromSeconds(9), "как дела?", SpeakerLabel: "Bob"),
        ];

        var markdown = MarkdownGenerator.Generate(note, profile, recording, segments);

        markdown.Should().Contain("**Alice (00:03):**");
        markdown.Should().Contain("**Bob (00:05):**");
        markdown.Should().Contain("Здравствуйте, как дела?");
        markdown.Should().NotContain("**Bob (00:07):**",
            "consecutive segments by the same speaker collapse under a single header");
    }

    [TestMethod]
    public void Generate_WithMixedNullAndLabeledSegments_RendersNullBlockAsNeutralSpeaker()
    {
        var (note, profile, recording) = BuildTranscriptNote("Alice opener. system narration. Bob reply.");
        IReadOnlyList<TranscriptSegment> segments =
        [
            new TranscriptSegment(TimeSpan.Zero, TimeSpan.FromSeconds(2), "Alice opener.", SpeakerLabel: "Alice"),
            new TranscriptSegment(TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(4), "system narration.", SpeakerLabel: null),
            new TranscriptSegment(TimeSpan.FromSeconds(4), TimeSpan.FromSeconds(6), "Bob reply.", SpeakerLabel: "Bob"),
        ];

        var markdown = MarkdownGenerator.Generate(note, profile, recording, segments);

        markdown.Should().Contain("**Alice (00:00):**");
        markdown.Should().Contain("**Speaker (00:02):**",
            "null-speaker segments between diarized ones get their own 'Speaker' header so context isn't absorbed silently");
        markdown.Should().Contain("**Bob (00:04):**");
    }

    private static (ProcessedNote note, Profile profile, Recording recording) BuildTranscriptNote(string fullText)
    {
        var profile = new Profile { Name = "Work" };
        var recording = new Recording { FileName = "meet.m4a", CreatedAt = DateTime.UtcNow };
        var note = new ProcessedNote
        {
            Topic = "Speaker test",
            Summary = "s",
            CleanTranscript = "clean",
            FullTranscript = fullText,
        };
        return (note, profile, recording);
    }
}
