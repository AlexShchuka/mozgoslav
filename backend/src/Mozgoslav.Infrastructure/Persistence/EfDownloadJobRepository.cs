using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Infrastructure.Persistence;

public sealed class EfDownloadJobRepository : IDownloadJobRepository
{
    private readonly IDbContextFactory<MozgoslavDbContext> _factory;

    public EfDownloadJobRepository(IDbContextFactory<MozgoslavDbContext> factory)
    {
        _factory = factory;
    }

    public async Task<DownloadJob?> TryGetAsync(Guid id, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        return await ctx.DownloadJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id, ct);
    }

    public async Task<DownloadJob?> TryGetActiveByCatalogueIdAsync(string catalogueId, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        return await ctx.DownloadJobs
            .AsNoTracking()
            .Where(j => j.CatalogueId == catalogueId &&
                        (j.State == DownloadState.Queued ||
                         j.State == DownloadState.Downloading ||
                         j.State == DownloadState.Finalizing))
            .OrderByDescending(j => j.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<IReadOnlyList<DownloadJob>> ListActiveAsync(CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        return await ctx.DownloadJobs
            .AsNoTracking()
            .Where(j => j.State == DownloadState.Queued ||
                        j.State == DownloadState.Downloading ||
                        j.State == DownloadState.Finalizing)
            .OrderBy(j => j.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(DownloadJob job, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        ctx.DownloadJobs.Add(job);
        await ctx.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(DownloadJob job, CancellationToken ct)
    {
        await using var ctx = await _factory.CreateDbContextAsync(ct);
        ctx.DownloadJobs.Update(job);
        await ctx.SaveChangesAsync(ct);
    }
}
