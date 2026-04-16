using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfProcessedNoteRepositoryTests
{
    [TestMethod]
    public async Task AddAsync_RoundTripsAllStructuredFields()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessedNoteRepository(ctx);

        var note = new ProcessedNote
        {
            TranscriptId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Version = 2,
            Summary = "Встретились, решили X",
            KeyPoints = ["тезис 1", "тезис 2"],
            Decisions = ["решение"],
            ActionItems = [new ActionItem("Иван", "сделать X", "пятница")],
            UnresolvedQuestions = ["кто ревьюит?"],
            Participants = ["Иван", "Ольга"],
            Topic = "Q2",
            ConversationType = ConversationType.Meeting,
            CleanTranscript = "clean text",
            FullTranscript = "raw text",
            Tags = ["meeting", "q2"],
            MarkdownContent = "# Note",
        };

        await repo.AddAsync(note, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfProcessedNoteRepository(freshCtx).GetByIdAsync(note.Id, CancellationToken.None);

        loaded.Should().NotBeNull();
        loaded.Version.Should().Be(2);
        loaded.KeyPoints.Should().BeEquivalentTo("тезис 1", "тезис 2");
        loaded.ActionItems.Should().ContainSingle().Which.Person.Should().Be("Иван");
        loaded.Participants.Should().BeEquivalentTo("Иван", "Ольга");
        loaded.ConversationType.Should().Be(ConversationType.Meeting);
        loaded.Tags.Should().BeEquivalentTo("meeting", "q2");
    }

    [TestMethod]
    public async Task GetByTranscriptIdAsync_SortsByVersionDescending()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessedNoteRepository(ctx);
        var transcriptId = Guid.NewGuid();

        await repo.AddAsync(new ProcessedNote { TranscriptId = transcriptId, ProfileId = Guid.NewGuid(), Version = 1 }, CancellationToken.None);
        await repo.AddAsync(new ProcessedNote { TranscriptId = transcriptId, ProfileId = Guid.NewGuid(), Version = 3 }, CancellationToken.None);
        await repo.AddAsync(new ProcessedNote { TranscriptId = transcriptId, ProfileId = Guid.NewGuid(), Version = 2 }, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var list = await new EfProcessedNoteRepository(freshCtx).GetByTranscriptIdAsync(transcriptId, CancellationToken.None);

        list.Select(n => n.Version).Should().ContainInOrder(3, 2, 1);
    }
}
