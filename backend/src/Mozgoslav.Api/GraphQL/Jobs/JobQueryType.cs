using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Data;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Api.GraphQL.Jobs;

[ExtendObjectType(typeof(QueryType))]
public sealed class JobQueryType
{
    [UsePaging]
    [UseFiltering]
    [UseSorting]
    public IQueryable<ProcessingJob> Jobs([Service] MozgoslavDbContext db) =>
        db.ProcessingJobs.OrderByDescending(j => j.CreatedAt);

    public IQueryable<ProcessingJob> ActiveJobs([Service] MozgoslavDbContext db) =>
        db.ProcessingJobs
            .Where(j => j.Status != Domain.Enums.JobStatus.Done
                && j.Status != Domain.Enums.JobStatus.Failed
                && j.Status != Domain.Enums.JobStatus.Cancelled)
            .OrderByDescending(j => j.CreatedAt);

    public async Task<ProcessingJob?> Job(
        Guid id,
        [Service] IProcessingJobRepository repository,
        CancellationToken ct)
        => await repository.GetByIdAsync(id, ct);
}
