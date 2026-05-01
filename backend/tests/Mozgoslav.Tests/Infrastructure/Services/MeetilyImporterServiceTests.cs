using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Services;

[TestClass]
public sealed class MeetilyImporterServiceTests
{
    private sealed class Fixture
    {
        public IRecordingRepository Recordings { get; } = Substitute.For<IRecordingRepository>();
        public ITranscriptRepository Transcripts { get; } = Substitute.For<ITranscriptRepository>();

        public MeetilyImporterService BuildSut() =>
            new(Recordings, Transcripts, NullLogger<MeetilyImporterService>.Instance);
    }

    private static async Task<string> CreateMeetilyDbAsync(bool withMeetingRow = false)
    {
        var path = Path.Combine(Path.GetTempPath(), $"meetily-test-{Guid.NewGuid():N}.db");
        await using var conn = new SqliteConnection($"DataSource={path}");
        await conn.OpenAsync();

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE meetings (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    audio_path TEXT,
                    created_at TEXT
                )
                """;
            await cmd.ExecuteNonQueryAsync();
        }

        await using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                CREATE TABLE transcripts (
                    id TEXT PRIMARY KEY,
                    meeting_id TEXT,
                    text TEXT
                )
                """;
            await cmd.ExecuteNonQueryAsync();
        }

        if (withMeetingRow)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT INTO meetings (id, title, audio_path, created_at) VALUES ('m1', 'Test', NULL, '2026-01-01T10:00:00Z')";
            await cmd.ExecuteNonQueryAsync();
        }

        return path;
    }

    [TestMethod]
    public async Task ImportAsync_NullPath_ThrowsArgumentException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.ImportAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task ImportAsync_WhitespacePath_ThrowsArgumentException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.ImportAsync("   ", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task ImportAsync_NonExistentFile_ThrowsFileNotFoundException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.ImportAsync("/tmp/this-file-does-not-exist-xyz.db", CancellationToken.None);

        await act.Should().ThrowAsync<FileNotFoundException>();
    }

    [TestMethod]
    public async Task ImportAsync_DbWithoutMeetilySchema_ThrowsInvalidOperationException()
    {
        var path = Path.Combine(Path.GetTempPath(), $"empty-{Guid.NewGuid():N}.db");
        try
        {
            await using (var conn = new SqliteConnection($"DataSource={path}"))
            {
                await conn.OpenAsync();
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "CREATE TABLE other_table (id TEXT)";
                await cmd.ExecuteNonQueryAsync();
            }

            var fixture = new Fixture();
            var sut = fixture.BuildSut();
            var act = async () => await sut.ImportAsync(path, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
        finally
        {
            if (File.Exists(path)) File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ImportAsync_EmptyMeetingsTable_ReturnsZeroCounts()
    {
        var path = await CreateMeetilyDbAsync();
        try
        {
            var fixture = new Fixture();
            var sut = fixture.BuildSut();

            var report = await sut.ImportAsync(path, CancellationToken.None);

            report.TotalMeetings.Should().Be(0);
            report.ImportedRecordings.Should().Be(0);
            report.SkippedDuplicates.Should().Be(0);
            report.Errors.Should().Be(0);
        }
        finally
        {
            if (File.Exists(path)) File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ImportAsync_MeetingWithNullAudioPath_SkipsEntry()
    {
        var path = await CreateMeetilyDbAsync(withMeetingRow: true);
        try
        {
            var fixture = new Fixture();
            var sut = fixture.BuildSut();

            var report = await sut.ImportAsync(path, CancellationToken.None);

            report.TotalMeetings.Should().Be(1);
            report.SkippedDuplicates.Should().Be(1);
            report.ImportedRecordings.Should().Be(0);
        }
        finally
        {
            if (File.Exists(path)) File.Delete(path);
        }
    }
}
