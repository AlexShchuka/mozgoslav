using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Persistence;

public interface IDownloadJobRepository
{
    Task<DownloadJob?> TryGetAsync(Guid id, CancellationToken ct);

    Task<DownloadJob?> TryGetActiveByCatalogueIdAsync(string catalogueId, CancellationToken ct);

    Task<IReadOnlyList<DownloadJob>> ListActiveAsync(CancellationToken ct);

    Task AddAsync(DownloadJob job, CancellationToken ct);

    Task UpdateAsync(DownloadJob job, CancellationToken ct);
}
