using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.UseCases;

[TestClass]
public sealed class ProcessQueueWorkerEnrichmentTests
{
    private static readonly Guid ProfileId = Guid.NewGuid();
    private static readonly Guid RecordingId = Guid.NewGuid();
    private static readonly Guid JobId = Guid.NewGuid();

    private static SidecarProcessAllResult FakeEnrichment() => new(
        Diarize: new SidecarDiarizeResult([], 0),
        Gender: new SidecarGenderResult("unknown", 0),
        Emotion: new SidecarEmotionResult("neutral", 0, 0, 0),
        Ner: new SidecarNerResult([], [], [], []),
        CleanedText: "cleaned",
        Embedding: [0.1f, 0.2f]);

    private static (
        IProcessingJobRepository Jobs,
        IProcessingJobStageRepository Stages,
        IRecordingRepository Recordings,
        ITranscriptRepository Transcripts,
        IProcessedNoteRepository Notes,
        IProfileRepository Profiles,
        IAudioConverter AudioConverter,
        ITranscriptionService Transcription,
        ILlmService Llm,
        CorrectionService Correction,
        GlossaryApplicator Glossary,
        LlmCorrectionService LlmCorrection,
        IAppSettings Settings,
        IJobProgressNotifier Progress,
        IJobCancellationRegistry CancellationRegistry,
        IPythonSidecarClient Sidecar,
        IDomainEventBus EventBus,
        ProcessQueueWorker Sut) BuildWorker(bool enrichmentEnabled)
    {
        var jobs = Substitute.For<IProcessingJobRepository>();
        var stages = Substitute.For<IProcessingJobStageRepository>();
        var recordings = Substitute.For<IRecordingRepository>();
        var transcripts = Substitute.For<ITranscriptRepository>();
        var notes = Substitute.For<IProcessedNoteRepository>();
        var profiles = Substitute.For<IProfileRepository>();
        var audioConverter = Substitute.For<IAudioConverter>();
        var transcription = Substitute.For<ITranscriptionService>();
        var llm = Substitute.For<ILlmService>();
        var llmProvider = Substitute.For<ILlmProvider>();
        var glossaryRepo = Substitute.For<IGlossaryRepository>();
        var appSettings = Substitute.For<IAppSettings>();
        var progress = Substitute.For<IJobProgressNotifier>();
        var cancellation = Substitute.For<IJobCancellationRegistry>();
        var sidecar = Substitute.For<IPythonSidecarClient>();
        var eventBus = Substitute.For<IDomainEventBus>();

        appSettings.Language.Returns("ru");
        appSettings.WhisperModelPath.Returns(string.Empty);
        appSettings.SidecarEnrichmentEnabled.Returns(enrichmentEnabled);

        var profile = new Profile
        {
            Id = ProfileId,
            Name = "Test",
            IsDefault = true,
            CleanupLevel = CleanupLevel.Light,
            SystemPrompt = "test",
            LlmCorrectionEnabled = false
        };
        profiles.GetByIdAsync(ProfileId, Arg.Any<CancellationToken>()).Returns(profile);

        var wavPath = Path.Combine(Path.GetTempPath(), $"test-{Guid.NewGuid():N}.wav");
        audioConverter.ConvertToWavAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(wavPath);

        transcription.TranscribeAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<string?>(),
            Arg.Any<IProgress<int>>(),
            Arg.Any<CancellationToken>())
            .Returns([new TranscriptSegment { Text = "hello", Start = TimeSpan.Zero, End = TimeSpan.FromSeconds(1) }]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);

        notes.GetByTranscriptIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new List<ProcessedNote>());

        var recording = new Recording
        {
            Id = RecordingId,
            FileName = "test.wav",
            FilePath = "/tmp/test.wav",
            Format = AudioFormat.Wav,
            SourceType = SourceType.Imported
        };
        recordings.GetByIdAsync(RecordingId, Arg.Any<CancellationToken>()).Returns(recording);

        var cancellationSource = new CancellationTokenSource();
        var linkedToken = new CancellationTokenRegistration();
        cancellation.Register(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(cancellationSource);

        var glossary = new GlossaryApplicator(glossaryRepo);
        var correction = new CorrectionService();
        var llmCorrection = new LlmCorrectionService(llmProvider);

        sidecar.ProcessAllAsync(Arg.Any<string>(), Arg.Any<IReadOnlyList<string>?>(), Arg.Any<CancellationToken>())
            .Returns(FakeEnrichment());

        var sut = new ProcessQueueWorker(
            jobs, stages, recordings, transcripts, notes, profiles,
            audioConverter, transcription, llm,
            correction, glossary, llmCorrection,
            appSettings, progress, cancellation, sidecar, eventBus,
            NullLogger<ProcessQueueWorker>.Instance);

        return (jobs, stages, recordings, transcripts, notes, profiles,
            audioConverter, transcription, llm,
            correction, glossary, llmCorrection,
            appSettings, progress, cancellation, sidecar, eventBus, sut);
    }

    private static ProcessingJob MakeJob() => new()
    {
        Id = JobId,
        RecordingId = RecordingId,
        ProfileId = ProfileId,
        Status = JobStatus.Pending
    };

    [TestMethod]
    public async Task ProcessJobAsync_WhenEnrichmentEnabled_CallsProcessAllAsync()
    {
        var (jobs, _, _, _, _, _, _, _, _, _, _, _, _, _, cancellation, sidecar, _, sut) =
            BuildWorker(enrichmentEnabled: true);

        var job = MakeJob();
        jobs.GetByIdAsync(JobId, Arg.Any<CancellationToken>()).Returns(job);
        cancellation.Register(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new CancellationTokenSource());

        await sut.ProcessJobAsync(JobId, CancellationToken.None);

        await sidecar.Received(1).ProcessAllAsync(
            Arg.Any<string>(),
            Arg.Is<IReadOnlyList<string>?>(s => s == null),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessJobAsync_WhenEnrichmentDisabled_DoesNotCallProcessAllAsync()
    {
        var (jobs, _, _, _, _, _, _, _, _, _, _, _, _, _, cancellation, sidecar, _, sut) =
            BuildWorker(enrichmentEnabled: false);

        var job = MakeJob();
        jobs.GetByIdAsync(JobId, Arg.Any<CancellationToken>()).Returns(job);
        cancellation.Register(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new CancellationTokenSource());

        await sut.ProcessJobAsync(JobId, CancellationToken.None);

        await sidecar.DidNotReceive().ProcessAllAsync(
            Arg.Any<string>(),
            Arg.Any<IReadOnlyList<string>?>(),
            Arg.Any<CancellationToken>());
    }
}
