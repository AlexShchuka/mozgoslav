using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using GreenDonut;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed class ProcessingJobByIdDataLoader : BatchDataLoader<Guid, ProcessingJob>
{
    private readonly IProcessingJobRepository _repository;

    public ProcessingJobByIdDataLoader(
        IProcessingJobRepository repository,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _repository = repository;
    }

    protected override async Task<IReadOnlyDictionary<Guid, ProcessingJob>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        var jobs = await _repository.GetByIdsAsync(keys, cancellationToken);
        return jobs.ToDictionary(j => j.Id);
    }
}
