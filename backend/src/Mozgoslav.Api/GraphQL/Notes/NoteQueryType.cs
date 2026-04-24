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

namespace Mozgoslav.Api.GraphQL.Notes;

[ExtendObjectType(typeof(QueryType))]
public sealed class NoteQueryType
{
    [UsePaging]
    [UseFiltering]
    [UseSorting]
    public IQueryable<ProcessedNote> Notes([Service] MozgoslavDbContext db) =>
        db.ProcessedNotes.OrderByDescending(n => n.CreatedAt);

    public async Task<ProcessedNote?> Note(
        Guid id,
        [Service] IProcessedNoteRepository repository,
        CancellationToken ct)
        => await repository.GetByIdAsync(id, ct);
}
