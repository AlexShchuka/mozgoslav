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

public sealed class EfProfileRepository : IProfileRepository
{
    private readonly MozgoslavDbContext _db;

    public EfProfileRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<Profile> AddAsync(Profile profile, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(profile);
        var exists = await _db.Profiles.AsNoTracking().AnyAsync(p => p.Id == profile.Id, ct);
        if (exists)
        {
            return profile;
        }
        _db.Profiles.Add(profile);
        await _db.SaveChangesAsync(ct);
        return profile;
    }

    public Task<Profile?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Profiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Profile?> TryGetDefaultAsync(CancellationToken ct) =>
        _db.Profiles.AsNoTracking()
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<Profile>> GetAllAsync(CancellationToken ct) =>
        await _db.Profiles.AsNoTracking()
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

    public async Task UpdateAsync(Profile profile, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(profile);
        _db.Profiles.Update(profile);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var profile = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (profile is not null)
        {
            _db.Profiles.Remove(profile);
            await _db.SaveChangesAsync(ct);
        }
    }
}
