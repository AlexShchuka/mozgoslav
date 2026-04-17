using FluentAssertions;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Api.BackgroundServices;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007 BC-016 / bug 20 — jobs left in any non-terminal in-flight state
/// (Transcribing / Correcting / Summarizing / Exporting) when the host
/// process died must be requeued at next startup so user work is never
/// silently lost. Hits the static reconciliation seam directly so the test
/// is deterministic and never races against <c>ProcessQueueWorker</c>.
/// </summary>
[TestClass]
public sealed class QueueStartupReconciliationTests
{
    [TestMethod]
    public async Task ReconcileAsync_StuckInFlightJobs_FlipsToQueued()
    {
        await using var db = new TestDatabase();

        await using (var ctx = db.CreateContext())
        {
            await ctx.ProcessingJobs.AddRangeAsync(
            [
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Transcribing, Progress = 30, StartedAt = DateTime.UtcNow },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Correcting, Progress = 55, StartedAt = DateTime.UtcNow },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Summarizing, Progress = 70, StartedAt = DateTime.UtcNow },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Exporting, Progress = 90, StartedAt = DateTime.UtcNow },
            ], TestContext.CancellationToken);
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        int requeued;
        await using (var ctx = db.CreateContext())
        {
            var repo = new EfProcessingJobRepository(ctx);
            requeued = await QueueBackgroundService.ReconcileAsync(repo, TestContext.CancellationToken);
        }

        requeued.Should().Be(4);

        await using (var ctx = db.CreateContext())
        {
            var jobs = await ctx.ProcessingJobs.AsNoTracking().ToListAsync(TestContext.CancellationToken);
            jobs.Should().HaveCount(4);
            jobs.Should().OnlyContain(j => j.Status == JobStatus.Queued);
            jobs.Should().OnlyContain(j => j.ErrorMessage == "app restarted — auto-requeued");
            jobs.Should().OnlyContain(j => j.Progress == 0);
            jobs.Should().OnlyContain(j => j.StartedAt == null);
        }
    }

    [TestMethod]
    public async Task ReconcileAsync_TerminalJobs_AreLeftAlone()
    {
        await using var db = new TestDatabase();

        await using (var ctx = db.CreateContext())
        {
            await ctx.ProcessingJobs.AddRangeAsync(
            [
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Done, Progress = 100 },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Failed, ErrorMessage = "pre-existing error" },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Queued },
                new ProcessingJob { RecordingId = Guid.NewGuid(), ProfileId = Guid.NewGuid(), Status = JobStatus.Transcribing, Progress = 40 },
            ], TestContext.CancellationToken);
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        int requeued;
        await using (var ctx = db.CreateContext())
        {
            var repo = new EfProcessingJobRepository(ctx);
            requeued = await QueueBackgroundService.ReconcileAsync(repo, TestContext.CancellationToken);
        }

        requeued.Should().Be(1);

        await using (var ctx = db.CreateContext())
        {
            var jobs = await ctx.ProcessingJobs.AsNoTracking().OrderBy(j => j.Status).ToListAsync(TestContext.CancellationToken);
            jobs.Should().Contain(j => j.Status == JobStatus.Done);
            jobs.Should().Contain(j => j.Status == JobStatus.Failed && j.ErrorMessage == "pre-existing error");
            jobs.Count(j => j.Status == JobStatus.Queued).Should().Be(2);
            jobs.Should().NotContain(j => j.Status == JobStatus.Transcribing);
        }
    }

    [TestMethod]
    public async Task ReconcileAsync_EmptyDatabase_ReturnsZero()
    {
        await using var db = new TestDatabase();

        int requeued;
        await using (var ctx = db.CreateContext())
        {
            var repo = new EfProcessingJobRepository(ctx);
            requeued = await QueueBackgroundService.ReconcileAsync(repo, TestContext.CancellationToken);
        }

        requeued.Should().Be(0);
    }

    public TestContext TestContext { get; set; }
}
