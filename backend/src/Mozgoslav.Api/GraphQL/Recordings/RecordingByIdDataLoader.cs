using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using GreenDonut;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed class RecordingByIdDataLoader : BatchDataLoader<Guid, Recording>
{
    private readonly IRecordingRepository _repository;

    public RecordingByIdDataLoader(
        IRecordingRepository repository,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _repository = repository;
    }

    protected override async Task<IReadOnlyDictionary<Guid, Recording>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        var recordings = await _repository.GetByIdsAsync(keys, cancellationToken);
        return recordings.ToDictionary(r => r.Id);
    }
}
