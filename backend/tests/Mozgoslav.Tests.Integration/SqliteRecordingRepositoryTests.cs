using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfRecordingRepositoryTests
{
    [TestMethod]
    public async Task AddAsync_ThenGetById_ReturnsPersistedRecording()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repository = new EfRecordingRepository(ctx);

        var recording = new Recording
        {
            FileName = "test.wav",
            FilePath = "/tmp/test.wav",
            Sha256 = "abcdef0123456789",
            Format = AudioFormat.Wav,
            SourceType = SourceType.Imported,
            Duration = TimeSpan.FromSeconds(42)
        };

        await repository.AddAsync(recording, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfRecordingRepository(freshCtx)
            .GetByIdAsync(recording.Id, CancellationToken.None);

        loaded.Should().NotBeNull();
        loaded.Id.Should().Be(recording.Id);
        loaded.FileName.Should().Be("test.wav");
        loaded.Sha256.Should().Be("abcdef0123456789");
        loaded.Format.Should().Be(AudioFormat.Wav);
        loaded.SourceType.Should().Be(SourceType.Imported);
        loaded.Duration.Should().Be(TimeSpan.FromSeconds(42));
    }

    [TestMethod]
    public async Task GetAllAsync_ReturnsAllInsertedRecordings()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repository = new EfRecordingRepository(ctx);

        await repository.AddAsync(new Recording
        {
            FileName = "a.wav",
            FilePath = "/tmp/a.wav",
            Sha256 = "aaa",
            Format = AudioFormat.Wav,
            SourceType = SourceType.Imported
        }, CancellationToken.None);

        await repository.AddAsync(new Recording
        {
            FileName = "b.mp3",
            FilePath = "/tmp/b.mp3",
            Sha256 = "bbb",
            Format = AudioFormat.Mp3,
            SourceType = SourceType.Recorded
        }, CancellationToken.None);

        var all = await repository.GetAllAsync(CancellationToken.None);

        all.Should().HaveCount(2);
        all.Select(r => r.Sha256).Should().Contain(["aaa", "bbb"]);
    }

    [TestMethod]
    public async Task GetBySha256Async_UnknownHash_ReturnsNull()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repository = new EfRecordingRepository(ctx);

        var result = await repository.GetBySha256Async("not-in-db", CancellationToken.None);

        result.Should().BeNull();
    }
}
