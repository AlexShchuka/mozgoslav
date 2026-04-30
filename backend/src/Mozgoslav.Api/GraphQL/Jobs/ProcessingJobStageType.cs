using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

[ExtendObjectType(typeof(ProcessingJob))]
public sealed class ProcessingJobStagesExtension
{
    public async Task<IReadOnlyList<ProcessingJobStage>> GetStages(
        [Parent] ProcessingJob job,
        ProcessingJobStagesByJobIdDataLoader loader,
        CancellationToken ct)
    {
        var result = await loader.LoadAsync(job.Id, ct);
        return result ?? [];
    }
}
