using FluentAssertions;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public class ReprocessUseCaseTests
{
    [TestMethod]
    public async Task ExecuteAsync_MissingRecording_Throws()
    {
        var (useCase, deps) = BuildUseCase();
        deps.Recordings.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Recording?)null);

        var act = () => useCase.ExecuteAsync(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Recording*not found");
    }

    [TestMethod]
    public async Task ExecuteAsync_MissingTranscript_Throws()
    {
        var (useCase, deps) = BuildUseCase();
        deps.Recordings.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new Recording { FileName = "a.m4a" });
        deps.Profiles.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new Profile { Name = "Work" });
        deps.Transcripts.GetByRecordingIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((Transcript?)null);

        var act = () => useCase.ExecuteAsync(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*transcript*");
    }

    [TestMethod]
    public async Task ExecuteAsync_IncrementsVersion_WhenPreviousNotesExist()
    {
        var (useCase, deps) = BuildUseCase();
        var recording = new Recording { FileName = "meeting.m4a" };
        var profile = new Profile { Name = "Work", CleanupLevel = CleanupLevel.Aggressive };
        var transcript = new Transcript { RecordingId = recording.Id, RawText = "текст" };

        deps.Recordings.GetByIdAsync(recording.Id, Arg.Any<CancellationToken>()).Returns(recording);
        deps.Profiles.GetByIdAsync(profile.Id, Arg.Any<CancellationToken>()).Returns(profile);
        deps.Transcripts.GetByRecordingIdAsync(recording.Id, Arg.Any<CancellationToken>()).Returns(transcript);
        deps.Notes.GetByTranscriptIdAsync(transcript.Id, Arg.Any<CancellationToken>())
            .Returns([new ProcessedNote { Version = 3 }]);
        deps.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);

        var note = await useCase.ExecuteAsync(recording.Id, profile.Id, CancellationToken.None);

        note.Version.Should().Be(4);
        await deps.Notes.Received(1).AddAsync(Arg.Any<ProcessedNote>(), Arg.Any<CancellationToken>());
    }

    private static (ReprocessUseCase UseCase, Deps Deps) BuildUseCase()
    {
        var deps = new Deps();
        var useCase = new ReprocessUseCase(
            deps.Recordings, deps.Transcripts, deps.Notes, deps.Profiles,
            deps.Llm, deps.Exporter, deps.Correction, deps.Settings);
        return (useCase, deps);
    }

    private sealed class Deps
    {
        public IRecordingRepository Recordings { get; } = Substitute.For<IRecordingRepository>();
        public ITranscriptRepository Transcripts { get; } = Substitute.For<ITranscriptRepository>();
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();
        public IProfileRepository Profiles { get; } = Substitute.For<IProfileRepository>();
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IMarkdownExporter Exporter { get; } = Substitute.For<IMarkdownExporter>();
        public CorrectionService Correction { get; } = new();
        public IAppSettings Settings { get; }

        public Deps()
        {
            var settings = Substitute.For<IAppSettings>();
            settings.VaultPath.Returns(string.Empty);
            settings.Snapshot.Returns(AppSettingsDto.Defaults);
            Settings = settings;
        }
    }
}
