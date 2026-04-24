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

public sealed class EfRecordingRepository : IRecordingRepository
{
    private readonly MozgoslavDbContext _db;

    public EfRecordingRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<Recording> AddAsync(Recording recording, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(recording);
        _db.Recordings.Add(recording);
        await _db.SaveChangesAsync(ct);
        return recording;
    }

    public Task<Recording?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Recordings.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<Recording?> GetBySha256Async(string sha256, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sha256);
        return _db.Recordings.AsNoTracking().FirstOrDefaultAsync(r => r.Sha256 == sha256, ct);
    }

    public async Task<IReadOnlyList<Recording>> GetAllAsync(CancellationToken ct) =>
        await _db.Recordings.AsNoTracking().OrderByDescending(r => r.CreatedAt).ToListAsync(ct);

    public async Task<IReadOnlyList<Recording>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct) =>
        await _db.Recordings.AsNoTracking().Where(r => ids.Contains(r.Id)).ToListAsync(ct);

    public async Task UpdateAsync(Recording recording, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(recording);
        _db.Recordings.Update(recording);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> TryDeleteAsync(Guid id, CancellationToken ct)
    {
        var recording = await _db.Recordings.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (recording is null)
        {
            return false;
        }
        _db.Recordings.Remove(recording);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
