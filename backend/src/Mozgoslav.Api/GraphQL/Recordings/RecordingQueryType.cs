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

namespace Mozgoslav.Api.GraphQL.Recordings;

[ExtendObjectType(typeof(QueryType))]
public sealed class RecordingQueryType
{
    [UsePaging]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Recording> Recordings([Service] MozgoslavDbContext db) =>
        db.Recordings.OrderByDescending(r => r.CreatedAt);

    public async Task<Recording?> Recording(
        Guid id,
        [Service] IRecordingRepository repository,
        CancellationToken ct)
        => await repository.GetByIdAsync(id, ct);
}
