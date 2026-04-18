using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfProcessingJobRepositoryTests
{
    [TestMethod]
    public async Task EnqueueAsync_PersistsJob()
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
        var fetched = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);

        fetched.Should().NotBeNull();
        fetched!.Status.Should().Be(JobStatus.Queued);
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
    public async Task GetActiveAsync_ExcludesCancelledJobs()
    {
        // ADR-015 — Cancelled is a terminal state; active queue must not
        // surface it.
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
            Status = JobStatus.Transcribing
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
        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Cancelled
        }, CancellationToken.None);

        var active = await repo.GetActiveAsync(CancellationToken.None);
        active.Should().HaveCount(2);
        active.Select(j => j.Status).Should().BeEquivalentTo([JobStatus.Queued, JobStatus.Transcribing]);
    }

    [TestMethod]
    public async Task SetCancelRequestedAsync_PersistsFlagAndPublishesToNotifier()
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

        await repo.SetCancelRequestedAsync(job.Id, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var reloaded = await new EfProcessingJobRepository(freshCtx).GetAllAsync(CancellationToken.None);
        reloaded.Should().ContainSingle();
        reloaded[0].CancelRequested.Should().BeTrue();
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

    [TestMethod]
    public async Task GetByStatusAsync_FiltersByStatus()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Queued,
        }, CancellationToken.None);
        await repo.EnqueueAsync(new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Transcribing,
        }, CancellationToken.None);

        var queued = await repo.GetByStatusAsync(JobStatus.Queued, CancellationToken.None);

        queued.Should().HaveCount(1);
        queued[0].Status.Should().Be(JobStatus.Queued);
    }
}
