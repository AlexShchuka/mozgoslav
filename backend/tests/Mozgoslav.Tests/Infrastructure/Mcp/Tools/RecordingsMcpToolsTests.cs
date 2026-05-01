using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Mcp.Tools;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Mcp.Tools;

[TestClass]
public sealed class RecordingsMcpToolsTests
{
    private sealed class Fixture
    {
        public IRecordingRepository Recordings { get; } = Substitute.For<IRecordingRepository>();

        public RecordingsMcpTools BuildSut() => new(Recordings);
    }

    private static Recording MakeRecording(DateTime createdAt) => new()
    {
        Id = Guid.NewGuid(),
        FileName = "test.m4a",
        FilePath = "/tmp/test.m4a",
        Sha256 = "abc123",
        Format = AudioFormat.M4A,
        SourceType = SourceType.Recorded,
        Status = RecordingStatus.Transcribed,
        Duration = TimeSpan.FromSeconds(120),
        CreatedAt = createdAt
    };

    [TestMethod]
    public async Task SearchAsync_NoFilter_ReturnsAllRecordingsOrderedByDate()
    {
        var fixture = new Fixture();
        var older = MakeRecording(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var newer = MakeRecording(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        fixture.Recordings.GetAllAsync(Arg.Any<CancellationToken>()).Returns([older, newer]);
        var sut = fixture.BuildSut();

        var result = await sut.SearchAsync(null, null, CancellationToken.None);

        result.Should().HaveCount(2);
        string.Compare(result[0].CreatedAt, result[1].CreatedAt, System.StringComparison.Ordinal).Should().BeGreaterThanOrEqualTo(0);
    }

    [TestMethod]
    public async Task SearchAsync_FromDateFilter_ExcludesOlderRecordings()
    {
        var fixture = new Fixture();
        var old = MakeRecording(new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        var recent = MakeRecording(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        fixture.Recordings.GetAllAsync(Arg.Any<CancellationToken>()).Returns([old, recent]);
        var sut = fixture.BuildSut();

        var result = await sut.SearchAsync("2026-01-01", null, CancellationToken.None);

        result.Should().HaveCount(1);
        result[0].FileName.Should().Be("test.m4a");
    }

    [TestMethod]
    public async Task SearchAsync_MapsFieldsCorrectly()
    {
        var fixture = new Fixture();
        var recording = MakeRecording(new DateTime(2026, 3, 15, 10, 0, 0, DateTimeKind.Utc));
        fixture.Recordings.GetAllAsync(Arg.Any<CancellationToken>()).Returns([recording]);
        var sut = fixture.BuildSut();

        var result = await sut.SearchAsync(null, null, CancellationToken.None);

        result.Should().HaveCount(1);
        var dto = result[0];
        dto.Id.Should().Be(recording.Id.ToString());
        dto.FileName.Should().Be("test.m4a");
        dto.DurationSeconds.Should().Be(120);
        dto.Status.Should().Be(RecordingStatus.Transcribed.ToString());
    }

    [TestMethod]
    public async Task SearchAsync_EmptyRepository_ReturnsEmpty()
    {
        var fixture = new Fixture();
        fixture.Recordings.GetAllAsync(Arg.Any<CancellationToken>()).Returns([]);
        var sut = fixture.BuildSut();

        var result = await sut.SearchAsync(null, null, CancellationToken.None);

        result.Should().BeEmpty();
    }
}
