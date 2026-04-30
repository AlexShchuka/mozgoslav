using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;

using NSubstitute;

namespace Mozgoslav.Tests.Services;

[TestClass]
public sealed class RecordingFinaliserTests
{
    [TestMethod]
    public async Task ResolveMetadataAsync_ComputesSha256FromFileContent()
    {
        var path = Path.Combine(Path.GetTempPath(), $"finaliser-sha256-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5], CancellationToken.None);

        try
        {
            var jobs = Substitute.For<IProcessingJobRepository>();
            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var finaliser = new RecordingFinaliser(jobs, scheduler);

            var metadata = await finaliser.ResolveMetadataAsync(path, probe: null, CancellationToken.None);

            metadata.Sha256.Should().NotBeNullOrEmpty();
            metadata.Sha256.Should().HaveLength(64, "SHA-256 hex string is always 64 characters");
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ResolveMetadataAsync_SameBytesYieldSameSha256()
    {
        var bytes = new byte[] { 9, 8, 7, 6, 5 };
        var pathA = Path.Combine(Path.GetTempPath(), $"finaliser-sha256-a-{Guid.NewGuid():N}.wav");
        var pathB = Path.Combine(Path.GetTempPath(), $"finaliser-sha256-b-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(pathA, bytes, CancellationToken.None);
        await File.WriteAllBytesAsync(pathB, bytes, CancellationToken.None);

        try
        {
            var jobs = Substitute.For<IProcessingJobRepository>();
            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var finaliser = new RecordingFinaliser(jobs, scheduler);

            var metaA = await finaliser.ResolveMetadataAsync(pathA, probe: null, CancellationToken.None);
            var metaB = await finaliser.ResolveMetadataAsync(pathB, probe: null, CancellationToken.None);

            metaA.Sha256.Should().Be(metaB.Sha256);
        }
        finally
        {
            File.Delete(pathA);
            File.Delete(pathB);
        }
    }

    [TestMethod]
    public async Task ResolveMetadataAsync_ReturnsDurationFromProbeWhenProvided()
    {
        var path = Path.Combine(Path.GetTempPath(), $"finaliser-duration-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3], CancellationToken.None);

        try
        {
            var jobs = Substitute.For<IProcessingJobRepository>();
            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var probe = Substitute.For<IAudioMetadataProbe>();
            probe.GetDurationAsync(path, Arg.Any<CancellationToken>())
                .Returns(TimeSpan.FromSeconds(99));

            var finaliser = new RecordingFinaliser(jobs, scheduler);

            var metadata = await finaliser.ResolveMetadataAsync(path, probe, CancellationToken.None);

            metadata.Duration.Should().Be(TimeSpan.FromSeconds(99));
            await probe.Received(1).GetDurationAsync(path, Arg.Any<CancellationToken>());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ResolveMetadataAsync_ReturnsDurationZeroWhenProbeIsNull()
    {
        var path = Path.Combine(Path.GetTempPath(), $"finaliser-noprobe-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3], CancellationToken.None);

        try
        {
            var jobs = Substitute.For<IProcessingJobRepository>();
            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var finaliser = new RecordingFinaliser(jobs, scheduler);

            var metadata = await finaliser.ResolveMetadataAsync(path, probe: null, CancellationToken.None);

            metadata.Duration.Should().Be(TimeSpan.Zero);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task EnqueueAndScheduleAsync_EnqueuesJobWithCorrectRecordingAndProfileIds()
    {
        var recordingId = Guid.NewGuid();
        var profileId = Guid.NewGuid();

        var jobs = Substitute.For<IProcessingJobRepository>();
        var scheduler = Substitute.For<IProcessingJobScheduler>();

        jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<ProcessingJob>());

        var finaliser = new RecordingFinaliser(jobs, scheduler);

        await finaliser.EnqueueAndScheduleAsync(recordingId, profileId, CancellationToken.None);

        await jobs.Received(1).EnqueueAsync(
            Arg.Is<ProcessingJob>(j => j.RecordingId == recordingId && j.ProfileId == profileId),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task EnqueueAndScheduleAsync_SchedulesJobWithJobIdReturnedByRepository()
    {
        var recordingId = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var expectedJobId = Guid.NewGuid();

        var jobs = Substitute.For<IProcessingJobRepository>();
        var scheduler = Substitute.For<IProcessingJobScheduler>();

        jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
            .Returns(new ProcessingJob { Id = expectedJobId, RecordingId = recordingId, ProfileId = profileId });

        var finaliser = new RecordingFinaliser(jobs, scheduler);

        await finaliser.EnqueueAndScheduleAsync(recordingId, profileId, CancellationToken.None);

        await scheduler.Received(1).ScheduleAsync(expectedJobId, Arg.Any<CancellationToken>());
    }
}
