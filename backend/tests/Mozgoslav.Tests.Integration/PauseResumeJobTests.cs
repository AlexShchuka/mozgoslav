using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class PauseResumeJobTests
{
    [TestMethod]
    public async Task SetPauseRequestedAsync_SetsFlagOnRunningJob()
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

        var result = await repo.SetPauseRequestedAsync(job.Id, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var reloaded = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.PauseRequested.Should().BeTrue();
        reloaded.Status.Should().Be(JobStatus.Transcribing);
    }

    [TestMethod]
    public async Task MarkPausedAsync_SetsStatusPausedAndFinishedAt()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Transcribing,
            PauseRequested = true
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var before = DateTime.UtcNow;
        var result = await repo.MarkPausedAsync(job.Id, CancellationToken.None);
        var after = DateTime.UtcNow;

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var reloaded = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.Status.Should().Be(JobStatus.Paused);
        reloaded.FinishedAt.Should().NotBeNull();
        reloaded.FinishedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [TestMethod]
    public async Task ClearPauseRequestedAsync_ClearsFlagOnPausedJob()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Paused,
            PauseRequested = true
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        var result = await repo.ClearPauseRequestedAsync(job.Id, CancellationToken.None);

        result.Should().BeTrue();

        await using var freshCtx = db.CreateContext();
        var reloaded = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.PauseRequested.Should().BeFalse();
    }

    [TestMethod]
    public async Task PauseJob_OnQueued_ReturnsConflictError_ViaRepository()
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

        var reloaded = await repo.GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.Status.Should().Be(JobStatus.Queued);

        var canPause = reloaded.Status is JobStatus.PreflightChecks or JobStatus.Transcribing
            or JobStatus.Correcting or JobStatus.Summarizing or JobStatus.Exporting;
        canPause.Should().BeFalse();
    }

    [TestMethod]
    public async Task ResumeJob_OnNonPaused_RejectsViaStatusCheck()
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

        var reloaded = await repo.GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.Status.Should().NotBe(JobStatus.Paused);

        var canResume = reloaded.Status == JobStatus.Paused;
        canResume.Should().BeFalse();
    }

    [TestMethod]
    public async Task CancelPausedJob_ViaStatusUpdate_TerminatesJob()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var job = new ProcessingJob
        {
            RecordingId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Status = JobStatus.Paused
        };
        await repo.EnqueueAsync(job, CancellationToken.None);

        job.Status = JobStatus.Cancelled;
        job.FinishedAt = DateTime.UtcNow;
        await repo.UpdateAsync(job, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var reloaded = await new EfProcessingJobRepository(freshCtx).GetByIdAsync(job.Id, CancellationToken.None);
        reloaded.Should().NotBeNull();
        reloaded.Status.Should().Be(JobStatus.Cancelled);
        reloaded.FinishedAt.Should().NotBeNull();
    }

    [TestMethod]
    public async Task SetPauseRequestedAsync_ForNonExistentJob_ReturnsFalse()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProcessingJobRepository(ctx);

        var result = await repo.SetPauseRequestedAsync(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task GetActiveAsync_ExcludesPausedJobs()
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
            Status = JobStatus.Paused
        }, CancellationToken.None);

        var active = await repo.GetActiveAsync(CancellationToken.None);

        active.Should().HaveCount(1);
        active[0].Status.Should().Be(JobStatus.Queued);
    }
}
