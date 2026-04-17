using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// ADR-011 step 6 — the worker is no longer loop-driven; Quartz triggers hand
/// it a specific job id. These tests pin the per-id pipeline semantics (happy
/// path, LLM unavailable, vault empty, transcription failure, host shutdown).
/// </summary>
[TestClass]
public sealed class ProcessQueueWorkerTests
{
    [TestMethod]
    public async Task ProcessJobAsync_UnknownJob_IsNoOp()
    {
        var fixture = new Fixture();
        fixture.Jobs.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((ProcessingJob?)null);

        await fixture.Worker.ProcessJobAsync(Guid.NewGuid(), CancellationToken.None);

        await fixture.Recordings.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, CancellationToken.None);
    }

    [TestMethod]
    public async Task ProcessJobAsync_AlreadyTerminal_IsNoOp()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob(JobStatus.Done);

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        await fixture.Recordings.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, CancellationToken.None);
    }

    [TestMethod]
    public async Task ProcessJobAsync_HappyPath_RunsFullPipelineAndMarksJobDone()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Done);
        job.Progress.Should().Be(100);
        job.FinishedAt.Should().NotBeNull();

        await fixture.Transcripts.Received(1).AddAsync(Arg.Any<Transcript>(), Arg.Any<CancellationToken>());
        await fixture.Notes.Received(1).AddAsync(Arg.Any<ProcessedNote>(), Arg.Any<CancellationToken>());
        await fixture.Exporter.Received(1).ExportAsync(
            Arg.Any<ProcessedNote>(), Arg.Any<Profile>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await fixture.ProgressNotifier.Received().PublishAsync(
            Arg.Any<ProcessingJob>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessJobAsync_NoteVersion_StartsAtOne_WhenNoPriorNotesExist()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();
        fixture.Notes.GetByTranscriptIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProcessedNote>());

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        captured!.Version.Should().Be(1);
    }

    [TestMethod]
    public async Task ProcessJobAsync_NoteVersion_IncrementsPastLatest_OnReprocessing()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        fixture.Notes.GetByTranscriptIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(
            [
                new() { Version = 1 },
                new() { Version = 2 }
            ]);

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        captured!.Version.Should().Be(3);
    }

    [TestMethod]
    public async Task ProcessJobAsync_LlmUnavailable_KeepsRawTranscriptAndStillProducesNote()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline(llmAvailable: false);

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        captured.Should().NotBeNull();
        captured.Summary.Should().BeEmpty();
        captured.FullTranscript.Should().NotBeNullOrEmpty();
        await fixture.Llm.DidNotReceive().ProcessAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessJobAsync_ExportFailure_StillSavesNoteWithoutVaultPath()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();
        fixture.Exporter.ExportAsync(
                Arg.Any<ProcessedNote>(), Arg.Any<Profile>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<string>(_ => throw new IOException("disk full"));

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        captured.Should().NotBeNull();
        captured.ExportedToVault.Should().BeFalse();
        captured.VaultPath.Should().BeNull();
        job.Status.Should().Be(JobStatus.Done);
    }

    [TestMethod]
    public async Task ProcessJobAsync_VaultPathEmpty_DoesNotCallExporter()
    {
        var fixture = new Fixture { VaultPath = string.Empty };
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        await fixture.Exporter.DidNotReceiveWithAnyArgs().ExportAsync(null!, null!, null!, CancellationToken.None);
    }

    [TestMethod]
    public async Task ProcessJobAsync_UnknownRecording_MarksJobFailed()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.Recordings.GetByIdAsync(job.RecordingId, Arg.Any<CancellationToken>())
            .Returns((Recording?)null);

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Failed);
        job.ErrorMessage.Should().Contain("Recording");
        job.FinishedAt.Should().NotBeNull();
    }

    [TestMethod]
    public async Task ProcessJobAsync_TranscriptionThrows_MarksJobFailedButDoesNotStallPipeline()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();
        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(_ => throw new InvalidOperationException("STT failed"));

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Failed);
        job.ErrorMessage.Should().Contain("STT failed");
    }

    [TestMethod]
    public async Task ProcessJobAsync_CancellationPropagates()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();
        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(_ => throw new OperationCanceledException());

        var act = async () => await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    private sealed class Fixture
    {
        public IProcessingJobRepository Jobs { get; } = Substitute.For<IProcessingJobRepository>();
        public IRecordingRepository Recordings { get; } = Substitute.For<IRecordingRepository>();
        public ITranscriptRepository Transcripts { get; } = Substitute.For<ITranscriptRepository>();
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();
        public IProfileRepository Profiles { get; } = Substitute.For<IProfileRepository>();
        public IAudioConverter AudioConverter { get; } = Substitute.For<IAudioConverter>();
        public ITranscriptionService Transcription { get; } = Substitute.For<ITranscriptionService>();
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IMarkdownExporter Exporter { get; } = Substitute.For<IMarkdownExporter>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IJobProgressNotifier ProgressNotifier { get; } = Substitute.For<IJobProgressNotifier>();

        public string VaultPath { get; init; } = "/tmp/vault";

        public ProcessQueueWorker Worker => new(
            Jobs, Recordings, Transcripts, Notes, Profiles,
            AudioConverter, Transcription, Llm, Exporter,
            new CorrectionService(), Settings, ProgressNotifier,
            NullLogger<ProcessQueueWorker>.Instance);

        public ProcessingJob SeedJob(JobStatus status = JobStatus.Queued)
        {
            var job = new ProcessingJob
            {
                RecordingId = Guid.NewGuid(),
                ProfileId = Guid.NewGuid(),
                Status = status,
            };
            Jobs.GetByIdAsync(job.Id, Arg.Any<CancellationToken>()).Returns(job);
            return job;
        }

        public void ArrangeHappyPipeline(bool llmAvailable = true)
        {
            Settings.VaultPath.Returns(VaultPath);
            Settings.Language.Returns("ru");
            Settings.WhisperModelPath.Returns("/tmp/model.bin");

            Recordings.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns(new Recording
                {
                    FileName = "test.m4a",
                    FilePath = "/tmp/test.m4a",
                    Sha256 = "deadbeef",
                    Format = AudioFormat.M4A,
                    SourceType = SourceType.Imported
                });

            Profiles.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns(new Profile
                {
                    Name = "Test",
                    CleanupLevel = CleanupLevel.Light,
                    SystemPrompt = "test prompt"
                });

            AudioConverter.ConvertToWavAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns("/tmp/test.wav");

            Transcription.TranscribeAsync(
                    Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                    Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
                .Returns(
                [
                    new TranscriptSegment(TimeSpan.Zero, TimeSpan.FromSeconds(3), "Hello world"),
                    new TranscriptSegment(TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(6), "Second segment")
                ]);

            Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(llmAvailable);
            if (llmAvailable)
            {
                Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
                    .Returns(new LlmProcessingResult(
                        Summary: "Test summary",
                        KeyPoints: ["point 1"],
                        Decisions: Array.Empty<string>(),
                        ActionItems: Array.Empty<ActionItem>(),
                        UnresolvedQuestions: Array.Empty<string>(),
                        Participants: ["Alice"],
                        Topic: "Testing",
                        ConversationType: ConversationType.Meeting,
                        Tags: ["test"]));
            }

            Exporter.ExportAsync(
                    Arg.Any<ProcessedNote>(), Arg.Any<Profile>(),
                    Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns("/tmp/vault/test.md");
        }
    }
}
