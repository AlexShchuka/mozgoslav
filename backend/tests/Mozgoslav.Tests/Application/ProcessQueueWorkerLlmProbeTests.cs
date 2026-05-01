using System;
using System.Threading;
using System.Threading.Tasks;

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
public sealed class ProcessQueueWorkerLlmProbeTests
{
    [TestMethod]
    public async Task LlmIsAvailableAsync_CalledOncePerRun_WhenLlmEnabled()
    {
        using var f = new ProbeFixture();
        f.ArrangeHappyPipeline(llmAvailable: true, llmCorrectionEnabled: true);

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        await f.Llm.Received(1).IsAvailableAsync(Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task LlmIsAvailableAsync_CalledOncePerRun_WhenLlmUnavailable()
    {
        using var f = new ProbeFixture();
        f.ArrangeHappyPipeline(llmAvailable: false, llmCorrectionEnabled: true);

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        await f.Llm.Received(1).IsAvailableAsync(Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task LlmIsAvailableAsync_CalledOncePerRun_WhenLlmCorrectionDisabled()
    {
        using var f = new ProbeFixture();
        f.ArrangeHappyPipeline(llmAvailable: true, llmCorrectionEnabled: false);

        await f.Worker.ProcessJobAsync(f.Job.Id, CancellationToken.None);

        await f.Llm.Received(1).IsAvailableAsync(Arg.Any<CancellationToken>());
    }

    private sealed class ProbeFixture : IDisposable
    {
        public ProbeFixture()
        {
            System.IO.Directory.CreateDirectory(VaultPath);
            Stages.GetByJobIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
                .Returns(Array.Empty<ProcessingJobStage>());
            Job = SeedJob();
        }

        public void Dispose()
        {
            try { System.IO.Directory.Delete(VaultPath, true); }
            catch (System.IO.IOException) { }
            catch (UnauthorizedAccessException) { }
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

        public void ArrangeHappyPipeline(bool llmAvailable, bool llmCorrectionEnabled)
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
                    SystemPrompt = "test prompt",
                    LlmCorrectionEnabled = llmCorrectionEnabled
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
