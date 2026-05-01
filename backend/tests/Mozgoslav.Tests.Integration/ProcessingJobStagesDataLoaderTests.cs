using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class ProcessingJobStagesDataLoaderTests
{
    [TestMethod]
    public async Task GetByJobIdsAsync_MultipleJobIds_ReturnsBatchedResult()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var jobRepo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job1 = new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Done };
        var job2 = new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Done };
        await jobRepo.EnqueueAsync(job1, CancellationToken.None);
        await jobRepo.EnqueueAsync(job2, CancellationToken.None);

        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job1.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-10)
        }, CancellationToken.None);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job1.Id,
            StageName = "Cleaning transcript",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
        }, CancellationToken.None);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job2.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-3)
        }, CancellationToken.None);

        var allStages = await stageRepo.GetByJobIdsAsync([job1.Id, job2.Id], CancellationToken.None);

        allStages.Should().HaveCount(3);

        var job1Stages = allStages.Should().Contain(s => s.JobId == job1.Id);
        var job2Stages = allStages.Should().Contain(s => s.JobId == job2.Id);
    }

    [TestMethod]
    public async Task GetByJobIdsAsync_EmptyIdList_ReturnsEmpty()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var result = await stageRepo.GetByJobIdsAsync([], CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task GetByJobIdsAsync_UnknownJobIds_ReturnsEmpty()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var result = await stageRepo.GetByJobIdsAsync([Guid.NewGuid(), Guid.NewGuid()], CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task GetByJobIdsAsync_GroupingByJobId_ReturnsCorrectStagesPerJob()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var jobRepo = new EfProcessingJobRepository(ctx);
        var stageRepo = new EfProcessingJobStageRepository(ctx);

        var job = new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Done };
        await jobRepo.EnqueueAsync(job, CancellationToken.None);

        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Transcribing audio",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-10)
        }, CancellationToken.None);
        await stageRepo.AddAsync(new ProcessingJobStage
        {
            JobId = job.Id,
            StageName = "Summarizing via LLM",
            StartedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
        }, CancellationToken.None);

        var stages = await stageRepo.GetByJobIdsAsync([job.Id], CancellationToken.None);

        stages.Should().HaveCount(2);
        stages.Should().AllSatisfy(s => s.JobId.Should().Be(job.Id));
    }
}
