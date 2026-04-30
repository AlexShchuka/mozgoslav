using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessingJobStageRepository
{
    Task AddAsync(ProcessingJobStage stage, CancellationToken ct);
    Task UpdateAsync(ProcessingJobStage stage, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJobStage>> GetByJobIdAsync(Guid jobId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJobStage>> GetByJobIdsAsync(IReadOnlyList<Guid> jobIds, CancellationToken ct);
}
