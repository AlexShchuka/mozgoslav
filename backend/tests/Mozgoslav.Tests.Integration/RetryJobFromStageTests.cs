using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class RetryJobFromStageTests
{
    [TestMethod]
    public async Task RequestRetryFromStageAsync_Failed_RetryFromSummarizing_ResetsFromStageOnward()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed,
            ErrorMessage = "LLM crashed",
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            FinishedAt = DateTime.UtcNow.AddMinutes(-1)
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var transcribingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-9),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-8),
            DurationMs = 60000
        };
        var correctingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Cleaning transcript",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-8),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-7),
            DurationMs = 5000
        };
        var summarizingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Summarizing via LLM",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-7),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-6),
            DurationMs = 3000,
            ErrorMessage = "LLM crashed"
        };
        await stageRepo.AddAsync(transcribingStage, CancellationToken.None);
        await stageRepo.AddAsync(correctingStage, CancellationToken.None);
        await stageRepo.AddAsync(summarizingStage, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.Summarizing, skipFailed: false, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var freshRepo = new EfProcessingJobRepository(freshCtx);
        var freshStageRepo = new EfProcessingJobStageRepository(freshCtx);

        var reloadedJob = await freshRepo.GetByIdAsync(job.Id, CancellationToken.None);
        reloadedJob.Should().NotBeNull();
        reloadedJob.Status.Should().Be(JobStatus.Queued);
        reloadedJob.ErrorMessage.Should().BeNull();
        reloadedJob.StartedAt.Should().BeNull();
        reloadedJob.FinishedAt.Should().BeNull();

        var stages = await freshStageRepo.GetByJobIdAsync(job.Id, CancellationToken.None);

        var transcribing = stages.Single(s => s.StageName == "Transcribing audio");
        transcribing.FinishedAt.Should().NotBeNull();
        transcribing.ErrorMessage.Should().BeNull();

        var correcting = stages.Single(s => s.StageName == "Cleaning transcript");
        correcting.FinishedAt.Should().NotBeNull();
        correcting.ErrorMessage.Should().BeNull();

        var summarizing = stages.Single(s => s.StageName == "Summarizing via LLM");
        summarizing.FinishedAt.Should().BeNull();
        summarizing.ErrorMessage.Should().BeNull();
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_SkipFailed_MarksFromStageAsSkipped()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed,
            ErrorMessage = "LLM failed"
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var transcribingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-9),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-8),
            DurationMs = 60000
        };
        var llmStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "LLM correction",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-7),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-6),
            DurationMs = 1000,
            ErrorMessage = "LLM failed"
        };
        await stageRepo.AddAsync(transcribingStage, CancellationToken.None);
        await stageRepo.AddAsync(llmStage, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.LlmCorrection, skipFailed: true, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var freshStageRepo = new EfProcessingJobStageRepository(freshCtx);
        var stages = await freshStageRepo.GetByJobIdAsync(job.Id, CancellationToken.None);

        var transcribing = stages.Single(s => s.StageName == "Transcribing audio");
        transcribing.FinishedAt.Should().NotBeNull();
        transcribing.ErrorMessage.Should().BeNull();

        var llm = stages.Single(s => s.StageName == "LLM correction");
        llm.FinishedAt.Should().NotBeNull();
        llm.ErrorMessage.Should().Be("SKIPPED");
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_DoneJob_ReEnqueuesFromChosenStage()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Done,
            FinishedAt = DateTime.UtcNow
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var exportingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Exporting to vault",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            FinishedAt = DateTimeOffset.UtcNow,
            DurationMs = 500
        };
        await stageRepo.AddAsync(exportingStage, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.Exporting, skipFailed: false, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var reloadedJob = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);
        reloadedJob.Should().NotBeNull();
        reloadedJob.Status.Should().Be(JobStatus.Queued);
        reloadedJob.FinishedAt.Should().BeNull();

        var stages = await new EfProcessingJobStageRepository(freshCtx).GetByJobIdAsync(job.Id, CancellationToken.None);
        var exporting = stages.Single(s => s.StageName == "Exporting to vault");
        exporting.FinishedAt.Should().BeNull();
        exporting.ErrorMessage.Should().BeNull();
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_AlreadyCompletedStageWithSkipFalse_ResetsAndReruns()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed,
            ErrorMessage = "crash after correcting"
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var transcribingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-9),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-8),
            DurationMs = 60000
        };
        var correctingStage = new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Cleaning transcript",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-8),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-7),
            DurationMs = 2000
        };
        await stageRepo.AddAsync(transcribingStage, CancellationToken.None);
        await stageRepo.AddAsync(correctingStage, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.Correcting, skipFailed: false, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var stages = await new EfProcessingJobStageRepository(freshCtx).GetByJobIdAsync(job.Id, CancellationToken.None);

        var transcribing = stages.Single(s => s.StageName == "Transcribing audio");
        transcribing.FinishedAt.Should().NotBeNull();

        var correcting = stages.Single(s => s.StageName == "Cleaning transcript");
        correcting.FinishedAt.Should().BeNull();
        correcting.ErrorMessage.Should().BeNull();
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_NonExistentJob_ReturnsFalse()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var result = await repo.RequestRetryFromStageAsync(Guid.NewGuid(), JobStage.Summarizing, skipFailed: false, CancellationToken.None);

        result.Should().BeFalse();
    }
}
