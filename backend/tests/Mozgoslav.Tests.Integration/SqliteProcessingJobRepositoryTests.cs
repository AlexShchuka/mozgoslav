using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfProcessingJobRepositoryTests
{
    [TestMethod]
    public async Task EnqueueAsync_ThenDequeueNext_ReturnsQueuedJob()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid()
        };

        await repo.EnqueueAsync(job, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var dequeued = await new EfProcessingJobRepository(freshCtx).DequeueNextAsync(CancellationToken.None);

        dequeued.Should().NotBeNull();
        dequeued.Id.Should().Be(job.Id);
        dequeued.Status.Should().Be(JobStatus.Queued);
    }

    [TestMethod]
    public async Task DequeueNextAsync_OnlyReturnsQueuedJobs()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Done
        }, CancellationToken.None);

        var dequeued = await repo.DequeueNextAsync(CancellationToken.None);
        dequeued.Should().BeNull();
    }

    [TestMethod]
    public async Task GetActiveAsync_ExcludesTerminalStatuses()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Queued
        }, CancellationToken.None);
        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Done
        }, CancellationToken.None);
        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Failed
        }, CancellationToken.None);

        var active = await repo.GetActiveAsync(CancellationToken.None);
        active.Should().HaveCount(1);
        active[0].Status.Should().Be(JobStatus.Queued);
    }

    [TestMethod]
    public async Task CancelQueuedAsync_QueuedJob_RemovesAndReturnsTrue()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Queued
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var cancelled = await new EfProcessingJobRepository(freshCtx).CancelQueuedAsync(job.Id, CancellationToken.None);
        cancelled.Should().BeTrue();

        await using var verifyCtx = db.CreateContext();
        var remaining = await new EfProcessingJobRepository(verifyCtx).GetAllAsync(CancellationToken.None);
        remaining.Should().BeEmpty();
    }

    [TestMethod]
    public async Task CancelQueuedAsync_InFlightJob_ReturnsFalseAndKeeps()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Transcribing
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var cancelled = await new EfProcessingJobRepository(freshCtx).CancelQueuedAsync(job.Id, CancellationToken.None);
        cancelled.Should().BeFalse();

        await using var verifyCtx = db.CreateContext();
        var remaining = await new EfProcessingJobRepository(verifyCtx).GetAllAsync(CancellationToken.None);
        remaining.Should().HaveCount(1);
    }

    [TestMethod]
    public async Task CancelQueuedAsync_UnknownId_ReturnsFalse()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var cancelled = await new EfProcessingJobRepository(ctx).CancelQueuedAsync(Guid.NewGuid(), CancellationToken.None);
        cancelled.Should().BeFalse();
    }

    [TestMethod]
    public async Task UpdateAsync_PersistsProgressAndHint()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);
        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid()
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        job.Status = JobStatus.Transcribing;
        job.Progress = 42;
        job.CurrentStep = "Transcribing audio";
        job.UserHint = "meeting about Q2";
        await repo.UpdateAsync(job, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var all = await new EfProcessingJobRepository(freshCtx).GetAllAsync(CancellationToken.None);
        all[0].Progress.Should().Be(42);
        all[0].Status.Should().Be(JobStatus.Transcribing);
        all[0].CurrentStep.Should().Be("Transcribing audio");
        all[0].UserHint.Should().Be("meeting about Q2");
    }
}
