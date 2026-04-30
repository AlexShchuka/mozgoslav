using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using GreenDonut;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed class ProcessingJobStagesByJobIdDataLoader : BatchDataLoader<Guid, IReadOnlyList<ProcessingJobStage>>
{
    private readonly IProcessingJobStageRepository _repository;

    public ProcessingJobStagesByJobIdDataLoader(
        IProcessingJobStageRepository repository,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _repository = repository;
    }

    protected override async Task<IReadOnlyDictionary<Guid, IReadOnlyList<ProcessingJobStage>>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        var stages = await _repository.GetByJobIdsAsync(keys, cancellationToken);
        return stages
            .GroupBy(s => s.JobId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<ProcessingJobStage>)g.ToList());
    }
}
