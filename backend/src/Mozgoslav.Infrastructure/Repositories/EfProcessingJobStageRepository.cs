using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Repositories;

public sealed class EfProcessingJobStageRepository : IProcessingJobStageRepository
{
    private readonly MozgoslavDbContext _db;

    public EfProcessingJobStageRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(ProcessingJobStage stage, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(stage);
        _db.ProcessingJobStages.Add(stage);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(ProcessingJobStage stage, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(stage);
        _db.ProcessingJobStages.Update(stage);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<ProcessingJobStage>> GetByJobIdAsync(Guid jobId, CancellationToken ct)
    {
        var stages = await _db.ProcessingJobStages
            .AsNoTracking()
            .Where(s => s.JobId == jobId)
            .ToListAsync(ct);
        return stages.OrderBy(s => s.StartedAt).ToList();
    }

    public async Task<IReadOnlyList<ProcessingJobStage>> GetByJobIdsAsync(IReadOnlyList<Guid> jobIds, CancellationToken ct)
    {
        var stages = await _db.ProcessingJobStages
            .AsNoTracking()
            .Where(s => jobIds.Contains(s.JobId))
            .ToListAsync(ct);
        return stages.OrderBy(s => s.StartedAt).ToList();
    }
}
