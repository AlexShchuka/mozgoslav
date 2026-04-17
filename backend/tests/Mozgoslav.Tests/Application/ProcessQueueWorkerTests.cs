using System.Collections.Concurrent;

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

[TestClass]
public sealed class ProcessQueueWorkerTests
{
    [TestMethod]
    public async Task ProcessNextAsync_EmptyQueue_ReturnsFalse()
    {
        var fixture = new Fixture();
        fixture.Jobs.DequeueNextAsync(Arg.Any<CancellationToken>()).Returns((ProcessingJob?)null);

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeFalse();
        await fixture.Recordings.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, CancellationToken.None);
    }

    [TestMethod]
    public async Task ProcessNextAsync_HappyPath_RunsFullPipelineAndMarksJobDone()
    {
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
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
    public async Task ProcessNextAsync_NoteVersion_StartsAtOne_WhenNoPriorNotesExist()
    {
        var fixture = new Fixture();
        fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();
        fixture.Notes.GetByTranscriptIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<ProcessedNote>());

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        captured!.Version.Should().Be(1);
    }

    [TestMethod]
    public async Task ProcessNextAsync_NoteVersion_IncrementsPastLatest_OnReprocessing()
    {
        var fixture = new Fixture();
        fixture.EnqueueJob();
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

        await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        captured!.Version.Should().Be(3);
    }

    [TestMethod]
    public async Task ProcessNextAsync_LlmUnavailable_KeepsRawTranscriptAndStillProducesNote()
    {
        var fixture = new Fixture();
        fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline(llmAvailable: false);

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        captured.Should().NotBeNull();
        captured.Summary.Should().BeEmpty();
        captured.FullTranscript.Should().NotBeNullOrEmpty();
        await fixture.Llm.DidNotReceive().ProcessAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessNextAsync_ExportFailure_StillSavesNoteWithoutVaultPath()
    {
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();
        fixture.Exporter.ExportAsync(
                Arg.Any<ProcessedNote>(), Arg.Any<Profile>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<string>(_ => throw new IOException("disk full"));

        ProcessedNote? captured = null;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(n => captured = n),
            Arg.Any<CancellationToken>());

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
        captured.Should().NotBeNull();
        captured.ExportedToVault.Should().BeFalse();
        captured.VaultPath.Should().BeNull();
        job.Status.Should().Be(JobStatus.Done);
    }

    [TestMethod]
    public async Task ProcessNextAsync_VaultPathEmpty_DoesNotCallExporter()
    {
        var fixture = new Fixture { VaultPath = string.Empty };
        fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();

        await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        await fixture.Exporter.DidNotReceiveWithAnyArgs().ExportAsync(null!, null!, null!, CancellationToken.None);
    }

    [TestMethod]
    public async Task ProcessNextAsync_UnknownRecording_MarksJobFailed()
    {
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.Recordings.GetByIdAsync(job.RecordingId, Arg.Any<CancellationToken>())
            .Returns((Recording?)null);

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
        job.Status.Should().Be(JobStatus.Failed);
        job.ErrorMessage.Should().Contain("Recording");
        job.FinishedAt.Should().NotBeNull();
    }

    [TestMethod]
    public async Task ProcessNextAsync_TranscriptionThrows_MarksJobFailedButDoesNotStallQueue()
    {
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();
        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(_ => throw new InvalidOperationException("STT failed"));

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
        job.Status.Should().Be(JobStatus.Failed);
        job.ErrorMessage.Should().Contain("STT failed");
    }

    [TestMethod]
    public async Task ProcessNextAsync_WhenHostStopping_RethrowsCancellation()
    {
        // ADR-015 — host-stopping OCE (stoppingToken is cancelled) must still
        // propagate upward so the background service can exit its loop cleanly.
        // The in-flight job does NOT transition to Cancelled in this path.
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();
        using var hostStopping = new CancellationTokenSource();
        await hostStopping.CancelAsync();

        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(_ => throw new OperationCanceledException(hostStopping.Token));

        var act = async () => await fixture.Worker.ProcessNextAsync(hostStopping.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        job.Status.Should().NotBe(JobStatus.Cancelled);
    }

    [TestMethod]
    public async Task ProcessNextAsync_WhenCancelRequestedBeforeTranscribe_MarksCancelled()
    {
        // ADR-015 — cancel requested on a Queued job. Worker picks it up, sees
        // CancelRequested=true at the top of ProcessJobAsync and exits
        // immediately without running any pipeline stage.
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        job.CancelRequested = true;
        fixture.ArrangeHappyPipeline();

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
        job.Status.Should().Be(JobStatus.Cancelled);
        job.FinishedAt.Should().NotBeNull();
        await fixture.Transcription.DidNotReceiveWithAnyArgs().TranscribeAsync(
            default!, default!, default, default, default);
        await fixture.ProgressNotifier.Received().PublishAsync(
            Arg.Is<ProcessingJob>(j => j.Status == JobStatus.Cancelled), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessNextAsync_WhenTokenCancelledDuringTranscribe_MarksCancelled()
    {
        // ADR-015 — cooperative cancel during a pipeline stage. The per-job CT
        // in the registry is triggered (NOT the host-stopping token). Worker
        // catches OCE via `when (!stoppingToken.IsCancellationRequested)` and
        // marks Cancelled instead of Failed.
        var fixture = new Fixture();
        var job = fixture.EnqueueJob();
        fixture.ArrangeHappyPipeline();

        // Simulate the cancel endpoint flipping the registry for this job right
        // before the worker reaches Transcribe. Registry is singleton-scoped
        // in the fixture so the act of registering the job inside the worker
        // will return a CTS that is about to be cancelled here.
        fixture.CancellationRegistry.PreCancelOnRegister(job.Id);

        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(ci =>
            {
                var token = (CancellationToken)ci[4]!;
                token.ThrowIfCancellationRequested();
                throw new InvalidOperationException("perJobToken should have been cancelled");
            });

        var result = await fixture.Worker.ProcessNextAsync(CancellationToken.None);

        result.Should().BeTrue();
        job.Status.Should().Be(JobStatus.Cancelled);
        job.FinishedAt.Should().NotBeNull();
        job.ErrorMessage.Should().BeNull();
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
        public TestJobCancellationRegistry CancellationRegistry { get; } = new();

        public string VaultPath { get; init; } = "/tmp/vault";

        public ProcessQueueWorker Worker => new(
            Jobs, Recordings, Transcripts, Notes, Profiles,
            AudioConverter, Transcription, Llm, Exporter,
            new CorrectionService(),
            new GlossaryApplicator(),
            new LlmCorrectionService(
                Substitute.For<ILlmProviderFactory>(),
                new GlossaryApplicator(),
                NullLogger<LlmCorrectionService>.Instance),
            Settings, ProgressNotifier,
            CancellationRegistry,
            NullLogger<ProcessQueueWorker>.Instance);

        public ProcessingJob EnqueueJob()
        {
            var job = new ProcessingJob
            {
                RecordingId = Guid.NewGuid(),
                ProfileId = Guid.NewGuid()
            };
            Jobs.DequeueNextAsync(Arg.Any<CancellationToken>()).Returns(job);
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

    /// <summary>
    /// In-test implementation of <see cref="IJobCancellationRegistry"/> that
    /// supports pre-cancelling a registered CTS. Mirrors the production
    /// <c>JobCancellationRegistry</c> shape without the full static wiring.
    /// </summary>
    private sealed class TestJobCancellationRegistry : IJobCancellationRegistry
    {
        private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _map = new();
        private readonly HashSet<Guid> _preCancel = [];

        public void PreCancelOnRegister(Guid jobId) => _preCancel.Add(jobId);

        public CancellationTokenSource Register(Guid jobId, CancellationToken hostToken)
        {
            var linked = CancellationTokenSource.CreateLinkedTokenSource(hostToken);
            _map[jobId] = linked;
            if (_preCancel.Remove(jobId))
            {
                linked.Cancel();
            }
            return linked;
        }

        public void Unregister(Guid jobId)
        {
            if (_map.TryRemove(jobId, out var cts))
            {
                cts.Dispose();
            }
        }

        public bool TryCancel(Guid jobId)
        {
            if (!_map.TryGetValue(jobId, out var cts))
            {
                return false;
            }
            cts.Cancel();
            return true;
        }
    }
}
