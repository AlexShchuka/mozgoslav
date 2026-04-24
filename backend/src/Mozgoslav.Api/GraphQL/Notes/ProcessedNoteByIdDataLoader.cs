using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using GreenDonut;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Notes;

public sealed class ProcessedNoteByIdDataLoader : BatchDataLoader<Guid, ProcessedNote>
{
    private readonly IProcessedNoteRepository _repository;

    public ProcessedNoteByIdDataLoader(
        IProcessedNoteRepository repository,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _repository = repository;
    }

    protected override async Task<IReadOnlyDictionary<Guid, ProcessedNote>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        var notes = await _repository.GetByIdsAsync(keys, cancellationToken);
        return notes.ToDictionary(n => n.Id);
    }
}
