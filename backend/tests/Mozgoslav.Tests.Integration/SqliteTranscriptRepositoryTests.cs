using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfTranscriptRepositoryTests
{
    [TestMethod]
    public async Task AddAsync_SerializesSegmentsAsJson()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfTranscriptRepository(ctx);
        var transcript = new Transcript
        {
            RecordingId = Guid.NewGuid(),
            ModelUsed = "ggml-large-v3",
            Language = "ru",
            RawText = "Привет мир",
            Segments =
            [
                new TranscriptSegment(TimeSpan.Zero, TimeSpan.FromSeconds(1.2), "Привет"),
                new TranscriptSegment(TimeSpan.FromSeconds(1.2), TimeSpan.FromSeconds(2.5), "мир"),
            ],
        };

        await repo.AddAsync(transcript, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfTranscriptRepository(freshCtx).GetByIdAsync(transcript.Id, CancellationToken.None);

        loaded.Should().NotBeNull();
        loaded.Segments.Should().HaveCount(2);
        loaded.Segments[0].Text.Should().Be("Привет");
        loaded.Segments[0].End.Should().Be(TimeSpan.FromSeconds(1.2));
    }

    [TestMethod]
    public async Task GetByRecordingIdAsync_ReturnsLatest()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfTranscriptRepository(ctx);
        var recordingId = Guid.NewGuid();

        await repo.AddAsync(new Transcript
        {
            RecordingId = recordingId,
            ModelUsed = "a",
            RawText = "old",
            CreatedAt = DateTime.UtcNow.AddMinutes(-1),
        }, CancellationToken.None);
        await repo.AddAsync(new Transcript
        {
            RecordingId = recordingId,
            ModelUsed = "a",
            RawText = "new",
            CreatedAt = DateTime.UtcNow,
        }, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfTranscriptRepository(freshCtx).GetByRecordingIdAsync(recordingId, CancellationToken.None);

        loaded.Should().NotBeNull();
        loaded.RawText.Should().Be("new");
    }
}
