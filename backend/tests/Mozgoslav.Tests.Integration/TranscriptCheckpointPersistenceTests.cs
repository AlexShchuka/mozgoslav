using System;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007 §2.8 BC-017 — transcript-segment checkpoint survives a save/load
/// round-trip. Resume logic belongs to ProcessQueueWorker and is covered in
/// the dictation resume tests; this one freezes the storage contract.
/// </summary>
[TestClass]
public sealed class TranscriptCheckpointPersistenceTests
{
    [TestMethod]
    public async Task Transcript_WithCheckpointedSegment_RoundTripsThroughSqlite()
    {
        await using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var transcripts = scope.ServiceProvider.GetRequiredService<ITranscriptRepository>();
        var recordings = scope.ServiceProvider.GetRequiredService<IRecordingRepository>();

        var recording = new Recording
        {
            FileName = "x.wav",
            FilePath = "/tmp/x.wav",
            Sha256 = Guid.NewGuid().ToString("N"),
            Format = AudioFormat.Wav,
            SourceType = SourceType.Imported,
            Status = RecordingStatus.Transcribed,
            Duration = TimeSpan.FromMinutes(10),
        };
        await recordings.AddAsync(recording, TestContext.CancellationToken);

        var checkpoint = DateTime.UtcNow;
        var transcript = new Transcript
        {
            RecordingId = recording.Id,
            ModelUsed = "whisper-large-v3",
            Language = "ru",
            RawText = "partial...",
            Segments =
            [
                new TranscriptSegment(TimeSpan.FromSeconds(0), TimeSpan.FromSeconds(5), "hello", CheckpointAt: null),
                new TranscriptSegment(TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10), "world", CheckpointAt: checkpoint),
            ],
        };
        await transcripts.AddAsync(transcript, TestContext.CancellationToken);

        await using var verify = scope.ServiceProvider.GetRequiredService<IDbContextFactory<MozgoslavDbContext>>().CreateDbContext();
        var loaded = await verify.Transcripts.AsNoTracking().SingleAsync(t => t.Id == transcript.Id, TestContext.CancellationToken);
        loaded.Segments.Should().HaveCount(2);
        loaded.Segments[0].CheckpointAt.Should().BeNull();
        loaded.Segments[1].CheckpointAt.Should().NotBeNull();
        loaded.Segments[1].CheckpointAt!.Value.Should().BeCloseTo(checkpoint, TimeSpan.FromMilliseconds(50));
    }

    public TestContext TestContext { get; set; } = null!;
}
