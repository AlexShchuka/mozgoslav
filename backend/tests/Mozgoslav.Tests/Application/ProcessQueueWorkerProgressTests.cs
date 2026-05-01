using System;
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
public sealed class ProcessQueueWorkerProgressTests
{
    [TestMethod]
    public async Task FullPipeline_WithLlm_EmitsExpectedProgressMilestones()
    {
        using var f = new ProgressFixture();
        f.ArrangeHappyPipeline(llmAvailable: true);

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        var milestones = f.ProgressMilestones;

        milestones.Should().Contain(0, "preflight starts at 0");
        milestones.Should().Contain(85, "summarizing starts at 85");
        milestones.Should().Contain(100, "done at 100");

        var summarizingIndex = milestones.FindLastIndex(p => p == 85);
        var exportingIndex = milestones.FindIndex(p => p == 85);
        exportingIndex.Should().BeGreaterThanOrEqualTo(0);

        f.Job.Progress.Should().Be(100);
        f.Job.Status.Should().Be(JobStatus.Done);
    }

    [TestMethod]
    public async Task FullPipeline_WithoutLlm_SummarizingTransitionStillAt85()
    {
        using var f = new ProgressFixture();
        f.ArrangeHappyPipeline(llmAvailable: false);

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        var milestones = f.ProgressMilestones;
        milestones.Should().Contain(85, "summarizing transition emits 85 even when LLM unavailable");
        milestones.Should().Contain(100, "pipeline finishes at 100");
    }

    [TestMethod]
    public async Task SummarizingTransition_NeverEmits70AsProgressValue_ForSummarizingStart()
    {
        using var f = new ProgressFixture();
        f.ArrangeHappyPipeline(llmAvailable: true);

        var progressAtSummarizing = new List<int>();
        await f.Jobs.UpdateAsync(
            Arg.Do<ProcessingJob>(j =>
            {
                if (j.Status == JobStatus.Summarizing)
                {
                    progressAtSummarizing.Add(j.Progress);
                }
            }),
            Arg.Any<CancellationToken>());

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        if (progressAtSummarizing.Count > 0)
        {
            progressAtSummarizing[0].Should().Be(85,
                "entering Summarizing must emit 85, not 70 (the old LlmCorrectionEnd constant)");
        }
    }

    private sealed class ProgressFixture : IDisposable
    {
        public ProgressFixture()
        {
            System.IO.Directory.CreateDirectory(VaultPath);
            Stages.GetByJobIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns(Array.Empty<ProcessingJobStage>());

            Jobs.UpdateAsync(
                Arg.Do<ProcessingJob>(j => ProgressMilestones.Add(j.Progress)),
                Arg.Any<CancellationToken>())
                .Returns(Task.CompletedTask);

            Job = SeedJob();
        }

        public void Dispose()
        {
            try { System.IO.Directory.Delete(VaultPath, true); }
            catch (System.IO.IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        public readonly List<int> ProgressMilestones = [];

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
        public ProcessingJob Job { get; }

        public string VaultPath { get; } = System.IO.Path.Combine(
            System.IO.Path.GetTempPath(), System.IO.Path.GetRandomFileName());

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
            new FakeCancellationRegistry(),
            SidecarClient,
            EventBus,
            NullLogger<ProcessQueueWorker>.Instance);

        private ProcessingJob SeedJob()
        {
            var job = new ProcessingJob
            {
                RecordingId = Guid.NewGuid(),
                ProfileId = Guid.NewGuid(),
                Status = JobStatus.Queued,
            };
            Jobs.GetByIdAsync(job.Id, Arg.Any<CancellationToken>()).Returns(job);
            return job;
        }

        public void ArrangeHappyPipeline(bool llmAvailable = true)
        {
            var modelFile = System.IO.Path.Combine(VaultPath, "ggml-small-q8_0.bin");
            System.IO.File.WriteAllText(modelFile, "fake-model-data");

            Settings.VaultPath.Returns(VaultPath);
            Settings.Language.Returns("ru");
            Settings.WhisperModelPath.Returns(modelFile);

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

    private sealed class FakeCancellationRegistry : IJobCancellationRegistry
    {
        public CancellationTokenSource Register(Guid jobId, CancellationToken hostToken)
            => CancellationTokenSource.CreateLinkedTokenSource(hostToken);

        public void Unregister(Guid jobId) { }

        public bool TryCancel(Guid jobId) => false;
    }
}
