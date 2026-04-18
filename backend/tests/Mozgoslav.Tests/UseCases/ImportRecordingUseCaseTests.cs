using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

using NSubstitute;

namespace Mozgoslav.Tests.UseCases;

[TestClass]
public sealed class ImportRecordingUseCaseTests
{
    [TestMethod]
    public async Task ExecuteAsync_MissingFile_ThrowsFileNotFoundException()
    {
        var recordings = Substitute.For<IRecordingRepository>();
        var jobs = Substitute.For<IProcessingJobRepository>();
        var profiles = Substitute.For<IProfileRepository>();
        profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(CreateDefaultProfile());

        var scheduler = Substitute.For<IProcessingJobScheduler>();
        var useCase = new ImportRecordingUseCase(recordings, jobs, profiles, scheduler);

        var missingPath = Path.Combine(Path.GetTempPath(), $"missing-{Guid.NewGuid():N}.mp3");

        var act = async () => await useCase.ExecuteAsync([missingPath], profileId: null, CancellationToken.None);
        await act.Should().ThrowAsync<FileNotFoundException>();

        await recordings.DidNotReceive().AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>());
        await jobs.DidNotReceive().EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_fills_Duration_from_metadata_probe_when_available()
    {
        // Task #19 — if an IAudioMetadataProbe is wired in, ImportRecordingUseCase
        // must populate Recording.Duration at import time so the UI shows the real
        // length before transcription finishes.
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-probe-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5], TestContext.CancellationToken);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();
            var probe = Substitute.For<IAudioMetadataProbe>();
            probe.GetDurationAsync(path, Arg.Any<CancellationToken>())
                .Returns(TimeSpan.FromSeconds(42));

            var profile = CreateDefaultProfile();
            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(profile);
            recordings.GetBySha256Async(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns((Recording?)null);
            recordings.AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<Recording>());
            jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<ProcessingJob>());

            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var useCase = new ImportRecordingUseCase(
                recordings, jobs, profiles, scheduler, probe,
                Microsoft.Extensions.Logging.Abstractions.NullLogger<ImportRecordingUseCase>.Instance);

            var result = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            result[0].Duration.Should().Be(TimeSpan.FromSeconds(42));
            await probe.Received(1).GetDurationAsync(path, Arg.Any<CancellationToken>());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ExecuteAsync_leaves_Duration_zero_when_probe_is_not_wired()
    {
        // Task #19 — the probe is optional; existing tests / DI setups that
        // don't register IAudioMetadataProbe must still work (Duration stays
        // TimeSpan.Zero, the UI renders the "—" pending placeholder).
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-noprobe-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5], TestContext.CancellationToken);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();
            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(CreateDefaultProfile());
            recordings.AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<Recording>());
            jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<ProcessingJob>());

            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles, scheduler);

            var result = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            result[0].Duration.Should().Be(TimeSpan.Zero);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ExecuteAsync_NewFile_StoresRecordingAndEnqueuesJob()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-usecase-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5], TestContext.CancellationToken);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();

            var profile = CreateDefaultProfile();
            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(profile);
            recordings.GetBySha256Async(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns((Recording?)null);
            recordings.AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<Recording>());
            jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<ProcessingJob>());

            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles, scheduler);

            var result = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            result.Should().HaveCount(1);
            result[0].Format.Should().Be(AudioFormat.Wav);
            result[0].SourceType.Should().Be(SourceType.Imported);
            result[0].Sha256.Should().NotBeNullOrEmpty();

            await recordings.Received(1).AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>());
            await jobs.Received(1).EnqueueAsync(
                Arg.Is<ProcessingJob>(j => j.ProfileId == profile.Id),
                Arg.Any<CancellationToken>());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ExecuteAsync_DuplicateSha256_CreatesDistinctRowAndEnqueuesAgain()
    {
        // Product decision 2026-04-19 — import is no longer idempotent on
        // sha256. Re-importing the same audio content produces a new
        // Recording row + a fresh ProcessingJob. This replaces the previous
        // "deduplicate by sha256" behaviour.
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-dup-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [9, 9, 9], TestContext.CancellationToken);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();

            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(CreateDefaultProfile());
            recordings.AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<Recording>());
            jobs.EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>())
                .Returns(call => call.Arg<ProcessingJob>());

            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles, scheduler);

            var first = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);
            var second = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            first.Should().ContainSingle();
            second.Should().ContainSingle();
            first[0].Sha256.Should().Be(second[0].Sha256, "same content produces same hash");
            first[0].Id.Should().NotBe(second[0].Id, "but the two imports are distinct rows");

            await recordings.Received(2).AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>());
            await jobs.Received(2).EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>());
            // Never consult the lookup — the use case doesn't short-circuit on sha anymore.
            await recordings.DidNotReceive().GetBySha256Async(Arg.Any<string>(), Arg.Any<CancellationToken>());
        }
        finally
        {
            File.Delete(path);
        }
    }

    [TestMethod]
    public async Task ExecuteAsync_EmptyFile_LogsWarningAndSkipsRecording()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-empty-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [], TestContext.CancellationToken);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();
            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(CreateDefaultProfile());
            var scheduler = Substitute.For<IProcessingJobScheduler>();
            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles, scheduler);

            var result = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            result.Should().BeEmpty(
                "D1 — empty audio file means the Swift recorder flush failed; skip instead of creating a broken Recording");
            await recordings.DidNotReceive().AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>());
            await jobs.DidNotReceive().EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>());
        }
        finally
        {
            File.Delete(path);
        }
    }

    private static Profile CreateDefaultProfile() => new()
    {
        Name = "Test Default",
        IsDefault = true,
        CleanupLevel = CleanupLevel.Light,
        SystemPrompt = "test"
    };

    public TestContext TestContext { get; set; }
}
