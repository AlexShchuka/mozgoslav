using Microsoft.EntityFrameworkCore;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Repositories;

public sealed class EfProcessingJobRepository : IProcessingJobRepository
{
    private readonly MozgoslavDbContext _db;

    public EfProcessingJobRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<ProcessingJob> EnqueueAsync(ProcessingJob job, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(job);
        _db.ProcessingJobs.Add(job);
        await _db.SaveChangesAsync(ct);
        return job;
    }

    public Task<ProcessingJob?> DequeueNextAsync(CancellationToken ct) =>
        _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.Status == JobStatus.Queued)
            .OrderBy(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task UpdateAsync(ProcessingJob job, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(job);
        _db.ProcessingJobs.Update(job);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<ProcessingJob>> GetAllAsync(CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.RecordingId == recordingId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.Status != JobStatus.Done && j.Status != JobStatus.Failed)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<bool> CancelQueuedAsync(Guid id, CancellationToken ct)
    {
        var job = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (job is null || job.Status != JobStatus.Queued) return false;
        _db.ProcessingJobs.Remove(job);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<CancelJobResult> CancelAsync(Guid id, CancellationToken ct)
    {
        var job = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (job is null) return CancelJobResult.NotFound;
        if (job.Status == JobStatus.Done || job.Status == JobStatus.Failed)
        {
            return CancelJobResult.AlreadyTerminal;
        }
        if (job.Status == JobStatus.Queued)
        {
            _db.ProcessingJobs.Remove(job);
            await _db.SaveChangesAsync(ct);
            return CancelJobResult.RemovedFromQueue;
        }
        job.Status = JobStatus.Failed;
        job.ErrorMessage = "Cancelled by user";
        job.FinishedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return CancelJobResult.MarkedFailed;
    }
}
