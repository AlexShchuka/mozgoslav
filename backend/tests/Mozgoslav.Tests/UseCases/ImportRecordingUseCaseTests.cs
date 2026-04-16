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

        var useCase = new ImportRecordingUseCase(recordings, jobs, profiles);

        var missingPath = Path.Combine(Path.GetTempPath(), $"missing-{Guid.NewGuid():N}.mp3");

        var act = async () => await useCase.ExecuteAsync([missingPath], profileId: null, CancellationToken.None);
        await act.Should().ThrowAsync<FileNotFoundException>();

        await recordings.DidNotReceive().AddAsync(Arg.Any<Recording>(), Arg.Any<CancellationToken>());
        await jobs.DidNotReceive().EnqueueAsync(Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_NewFile_StoresRecordingAndEnqueuesJob()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-usecase-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5]);

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

            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles);

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
    public async Task ExecuteAsync_DuplicateSha256_IsIdempotentAndDoesNotEnqueue()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-dup-{Guid.NewGuid():N}.wav");
        await File.WriteAllBytesAsync(path, [9, 9, 9]);

        try
        {
            var recordings = Substitute.For<IRecordingRepository>();
            var jobs = Substitute.For<IProcessingJobRepository>();
            var profiles = Substitute.For<IProfileRepository>();

            profiles.TryGetDefaultAsync(Arg.Any<CancellationToken>()).Returns(CreateDefaultProfile());

            var existing = new Recording
            {
                FileName = "old.wav",
                FilePath = path,
                Sha256 = "deadbeef",
                Format = AudioFormat.Wav,
                SourceType = SourceType.Imported
            };
            recordings.GetBySha256Async(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns(existing);

            var useCase = new ImportRecordingUseCase(recordings, jobs, profiles);

            var result = await useCase.ExecuteAsync([path], profileId: null, CancellationToken.None);

            result.Should().ContainSingle().Which.Should().BeSameAs(existing);
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
}
