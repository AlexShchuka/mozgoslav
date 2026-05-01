using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

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

    public Task<ProcessingJob?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.ProcessingJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.Id == id, ct);

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

    public async Task<IReadOnlyList<ProcessingJob>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => ids.Contains(j.Id))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.RecordingId == recordingId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.Status != JobStatus.Done
                && j.Status != JobStatus.Failed
                && j.Status != JobStatus.Cancelled
                && j.Status != JobStatus.Paused)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessingJob>> GetByStatusAsync(JobStatus status, CancellationToken ct) =>
        await _db.ProcessingJobs.AsNoTracking()
            .Where(j => j.Status == status)
            .OrderBy(j => j.CreatedAt)
            .ToListAsync(ct);

    public async Task<bool> SetCancelRequestedAsync(Guid id, CancellationToken ct)
    {
        var existing = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (existing is null)
        {
            return false;
        }
        existing.CancelRequested = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SetPauseRequestedAsync(Guid id, CancellationToken ct)
    {
        var existing = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (existing is null)
        {
            return false;
        }
        existing.PauseRequested = true;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ClearPauseRequestedAsync(Guid id, CancellationToken ct)
    {
        var existing = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == id, ct);
        if (existing is null)
        {
            return false;
        }
        existing.PauseRequested = false;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RequestRetryFromStageAsync(Guid jobId, JobStage fromStage, bool skipFailed, CancellationToken ct)
    {
        var job = await _db.ProcessingJobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
        if (job is null)
        {
            return false;
        }

        job.Status = JobStatus.Queued;
        job.ErrorMessage = null;
        job.UserHint = null;
        job.StartedAt = null;
        job.FinishedAt = null;
        job.Progress = 0;
        job.CurrentStep = null;
        job.CancelRequested = false;
        job.PauseRequested = false;

        var stages = await _db.ProcessingJobStages
            .Where(s => s.JobId == jobId)
            .ToListAsync(ct);

        var fromIndex = StageOrderByStage[fromStage];

        foreach (var stage in stages)
        {
            var stageIndex = StageOrderByName.TryGetValue(stage.StageName, out var idx) ? idx : -1;
            if (stageIndex < fromIndex)
            {
                continue;
            }

            if (stageIndex == fromIndex && skipFailed)
            {
                stage.FinishedAt = DateTimeOffset.UtcNow;
                stage.ErrorMessage = "SKIPPED";
            }
            else
            {
                stage.FinishedAt = null;
                stage.DurationMs = null;
                stage.ErrorMessage = null;
            }
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static readonly Dictionary<JobStage, int> StageOrderByStage = new()
    {
        [JobStage.Transcribing] = 0,
        [JobStage.Correcting] = 1,
        [JobStage.LlmCorrection] = 2,
        [JobStage.Summarizing] = 3,
        [JobStage.Exporting] = 4,
    };

    private static readonly Dictionary<string, int> StageOrderByName = new(StringComparer.Ordinal)
    {
        ["Transcribing audio"] = 0,
        ["Cleaning transcript"] = 1,
        ["LLM correction"] = 2,
        ["Summarizing via LLM"] = 3,
        ["Exporting to vault"] = 4,
    };

}
