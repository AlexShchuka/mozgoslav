using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

[ExtendObjectType(typeof(ProcessingJob))]
public sealed class ProcessingJobStagesExtension
{
    public async Task<IReadOnlyList<ProcessingJobStage>> GetStages(
        [Parent] ProcessingJob job,
        [Service] IProcessingJobStageRepository stageRepository,
        CancellationToken ct)
        => await stageRepository.GetByJobIdAsync(job.Id, ct);
}
