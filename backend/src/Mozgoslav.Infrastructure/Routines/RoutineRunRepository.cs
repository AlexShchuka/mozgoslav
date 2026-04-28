using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Application.Routines;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Routines;

public sealed class RoutineRunRepository : IRoutineRunRepository
{
    private readonly MozgoslavDbContext _db;

    public RoutineRunRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<RoutineRun> AddAsync(RoutineRun run, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(run);
        _db.Set<RoutineRun>().Add(run);
        await _db.SaveChangesAsync(ct);
        return run;
    }

    public async Task UpdateAsync(RoutineRun run, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(run);
        _db.Set<RoutineRun>().Update(run);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<RoutineRun?> TryGetLatestAsync(string routineKey, CancellationToken ct)
    {
        return await _db.Set<RoutineRun>()
            .AsNoTracking()
            .Where(r => r.RoutineKey == routineKey)
            .OrderByDescending(r => r.StartedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<RoutineRun>> ListByKeyAsync(string routineKey, int limit, CancellationToken ct)
    {
        return await _db.Set<RoutineRun>()
            .AsNoTracking()
            .Where(r => r.RoutineKey == routineKey)
            .OrderByDescending(r => r.StartedAt)
            .Take(limit)
            .ToListAsync(ct);
    }
}
