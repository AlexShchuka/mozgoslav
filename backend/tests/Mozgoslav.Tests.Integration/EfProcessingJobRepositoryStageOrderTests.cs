using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfProcessingJobRepositoryStageOrderTests
{
    [TestMethod]
    public async Task RequestRetryFromStageAsync_FromTranscribing_ClearsAllStages()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        await using var stageCtx = db.CreateContext();
        var stageRepo = new EfProcessingJobStageRepository(stageCtx);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-9),
        }, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.Transcribing, false, CancellationToken.None);

        result.Should().BeTrue();
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_FromSummarizing_PreservesEarlierStages()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        await using var stageCtx = db.CreateContext();
        var stageRepo = new EfProcessingJobStageRepository(stageCtx);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-10),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-9),
        }, CancellationToken.None);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Summarizing via LLM",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            FinishedAt = DateTimeOffset.UtcNow.AddMinutes(-4),
        }, CancellationToken.None);

        var result = await repo.RequestRetryFromStageAsync(job.Id, JobStage.Summarizing, false, CancellationToken.None);

        result.Should().BeTrue();

        await using var verifyCtx = db.CreateContext();
        var verifyStageRepo = new EfProcessingJobStageRepository(verifyCtx);
        var stages = await verifyStageRepo.GetByJobIdAsync(job.Id, CancellationToken.None);

        var transcribingStage = stages.Should().Contain(s => s.StageName == "Transcribing audio").Which;
        transcribingStage.FinishedAt.Should().NotBeNull("transcribing is before summarizing and should be preserved");

        var summarizingStage = stages.Should().Contain(s => s.StageName == "Summarizing via LLM").Which;
        summarizingStage.FinishedAt.Should().BeNull("summarizing is the retry point and should be cleared");
    }

    [TestMethod]
    public async Task RequestRetryFromStageAsync_UnknownJob_ReturnsFalse()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var result = await repo.RequestRetryFromStageAsync(Guid.NewGuid(), JobStage.Transcribing, false, CancellationToken.None);

        result.Should().BeFalse();
    }
}
