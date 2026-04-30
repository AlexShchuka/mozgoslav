using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
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

namespace Mozgoslav.Tests.Application;

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
        await fixture.EventBus.Received(1).PublishAsync(
            Arg.Any<ProcessedNoteSaved>(), Arg.Any<CancellationToken>());
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
    public async Task ProcessJobAsync_HappyPath_PersistsNoteWithExportFlagFalse()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

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
    public async Task ProcessJobAsync_HappyPath_PublishesProcessedNoteSavedAfterAdd()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        var addedAt = -1;
        var publishedAt = -1;
        var sequence = 0;
        await fixture.Notes.AddAsync(
            Arg.Do<ProcessedNote>(_ => addedAt = ++sequence),
            Arg.Any<CancellationToken>());
        await fixture.EventBus.PublishAsync(
            Arg.Do<ProcessedNoteSaved>(_ => publishedAt = ++sequence),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        addedAt.Should().BeGreaterThan(0);
        publishedAt.Should().BeGreaterThan(addedAt);
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
    public async Task ProcessJobAsync_WhenHostStopping_RethrowsCancellation()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();
        using var hostStopping = new CancellationTokenSource();
        await hostStopping.CancelAsync();

        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(_ => throw new OperationCanceledException(hostStopping.Token));

        var act = async () => await fixture.Worker.ProcessJobAsync(job.Id, hostStopping.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
        job.Status.Should().NotBe(JobStatus.Cancelled);
    }

    [TestMethod]
    public async Task ProcessJobAsync_WhenCancelRequestedBeforeTranscribe_MarksCancelled()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        job.CancelRequested = true;
        fixture.ArrangeHappyPipeline();

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Cancelled);
        job.FinishedAt.Should().NotBeNull();
        await fixture.Transcription.DidNotReceiveWithAnyArgs().TranscribeAsync(
            default!, default!, default, default, default);
        await fixture.ProgressNotifier.Received().PublishAsync(
            Arg.Is<ProcessingJob>(j => j.Status == JobStatus.Cancelled), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ProcessJobAsync_WhenTokenCancelledDuringTranscribe_MarksCancelled()
    {
        var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        fixture.CancellationRegistry.PreCancelOnRegister(job.Id);

        fixture.Transcription
            .TranscribeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>(),
                Arg.Any<IProgress<int>?>(), Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<TranscriptSegment>>(ci =>
            {
                var token = (CancellationToken)ci[4];
                token.ThrowIfCancellationRequested();
                throw new InvalidOperationException("perJobToken should have been cancelled");
            });

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Cancelled);
        job.FinishedAt.Should().NotBeNull();
        job.ErrorMessage.Should().BeNull();
    }

    [TestMethod]
    public async Task ProcessJobAsync_MissingWhisperModel_FailsAtPreflightWithUserHint()
    {
        using var fixture = new Fixture();
        var job = fixture.SeedJob();

        fixture.Settings.VaultPath.Returns(fixture.VaultPath);
        fixture.Settings.Language.Returns("ru");
        fixture.Settings.WhisperModelPath.Returns("/nonexistent/path/ggml-small-q8_0.bin");

        fixture.Recordings.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new Recording
            {
                FileName = "test.m4a",
                FilePath = "/tmp/test.m4a",
                Sha256 = "deadbeef",
                Format = AudioFormat.M4A,
                SourceType = SourceType.Imported
            });

        fixture.Profiles.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(new Profile
            {
                Name = "Test",
                CleanupLevel = CleanupLevel.Light,
                SystemPrompt = "test prompt"
            });

        var started = DateTime.UtcNow;
        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);
        var elapsed = DateTime.UtcNow - started;

        job.Status.Should().Be(JobStatus.Failed);
        job.UserHint.Should().Contain("ggml-small-q8_0.bin");
        job.FinishedAt.Should().NotBeNull();
        elapsed.Should().BeLessThan(TimeSpan.FromMilliseconds(100));
        await fixture.Transcription.DidNotReceiveWithAnyArgs().TranscribeAsync(
            default!, default!, default, default, default);
    }

    [TestMethod]
    public async Task ProcessJobAsync_AllHealthy_ProgressesToTranscribing()
    {
        using var fixture = new Fixture();
        var job = fixture.SeedJob();
        fixture.ArrangeHappyPipeline();

        JobStatus? statusAfterPreflight = null;
        await fixture.Stages.AddAsync(
            Arg.Do<ProcessingJobStage>(_ => { }),
            Arg.Any<CancellationToken>());
        await fixture.Jobs.UpdateAsync(
            Arg.Do<ProcessingJob>(j =>
            {
                if (j.Status == JobStatus.Transcribing && statusAfterPreflight is null)
                {
                    statusAfterPreflight = j.Status;
                }
            }),
            Arg.Any<CancellationToken>());

        await fixture.Worker.ProcessJobAsync(job.Id, CancellationToken.None);

        job.Status.Should().Be(JobStatus.Done);
        statusAfterPreflight.Should().Be(JobStatus.Transcribing);
    }

    private sealed class Fixture : IDisposable
    {
        private readonly string _tempDir = System.IO.Path.Combine(
            System.IO.Path.GetTempPath(), System.IO.Path.GetRandomFileName());

        public Fixture()
        {
            System.IO.Directory.CreateDirectory(_tempDir);
        }

        public void Dispose()
        {
            try { System.IO.Directory.Delete(_tempDir, true); } catch { }
        }

        public IProcessingJobRepository Jobs { get; } = Substitute.For<IProcessingJobRepository>();
        public IProcessingJobStageRepository Stages { get; } = Substitute.For<IProcessingJobStageRepository>();
        public IRecordingRepository Recordings { get; } = Substitute.For<IRecordingRepository>();
        public ITranscriptRepository Transcripts { get; } = Substitute.For<ITranscriptRepository>();
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();
        public IProfileRepository Profiles { get; } = Substitute.For<IProfileRepository>();
        public IAudioConverter AudioConverter { get; } = Substitute.For<IAudioConverter>();
        public ITranscriptionService Transcription { get; } = Substitute.For<ITranscriptionService>();
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IJobProgressNotifier ProgressNotifier { get; } = Substitute.For<IJobProgressNotifier>();
        public IDomainEventBus EventBus { get; } = Substitute.For<IDomainEventBus>();
        public IPythonSidecarClient SidecarClient { get; } = Substitute.For<IPythonSidecarClient>();
        public TestJobCancellationRegistry CancellationRegistry { get; } = new();

        public string VaultPath => _tempDir;

        public string CreateModelFile(string name = "ggml-small-q8_0.bin")
        {
            var path = System.IO.Path.Combine(_tempDir, name);
            System.IO.File.WriteAllText(path, "fake-model-data");
            return path;
        }

        public ProcessQueueWorker Worker => new(
            Jobs, Stages, Recordings, Transcripts, Notes, Profiles,
            AudioConverter, Transcription, Llm,
            new CorrectionService(),
            new GlossaryApplicator(),
            new LlmCorrectionService(
                Substitute.For<ILlmProviderFactory>(),
                new GlossaryApplicator(),
                NullLogger<LlmCorrectionService>.Instance),
            Settings, ProgressNotifier,
            CancellationRegistry,
            SidecarClient,
            EventBus,
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
            Settings.WhisperModelPath.Returns(CreateModelFile());

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

        }
    }

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
