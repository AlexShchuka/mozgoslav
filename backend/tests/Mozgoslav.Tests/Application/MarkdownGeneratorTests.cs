using FluentAssertions;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Tests.Application;

[TestClass]
public class MarkdownGeneratorTests
{
    [TestMethod]
    public void Generate_IncludesFrontmatterAndSummary()
    {
        var profile = new Profile { Name = "Work", CleanupLevel = CleanupLevel.Aggressive, AutoTags = ["meeting"] };
        var recording = new Recording
        {
            FileName = "meeting.m4a",
            Duration = TimeSpan.FromMinutes(42),
            CreatedAt = new DateTime(2026, 04, 16, 10, 0, 0, DateTimeKind.Utc),
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
            FullTranscript = "raw",
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
}
