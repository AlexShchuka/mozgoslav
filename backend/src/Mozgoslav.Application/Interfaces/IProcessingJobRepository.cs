using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessingJobRepository
{
    Task<ProcessingJob> EnqueueAsync(ProcessingJob job, CancellationToken ct);
    Task<ProcessingJob?> GetByIdAsync(Guid id, CancellationToken ct);
    Task UpdateAsync(ProcessingJob job, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetAllAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByStatusAsync(JobStatus status, CancellationToken ct);

    Task<bool> SetCancelRequestedAsync(Guid id, CancellationToken ct);

    Task<bool> SetPauseRequestedAsync(Guid id, CancellationToken ct);
    Task<bool> ClearPauseRequestedAsync(Guid id, CancellationToken ct);
    Task<bool> MarkPausedAsync(Guid id, CancellationToken ct);

    Task<bool> RequestRetryFromStageAsync(Guid jobId, JobStage fromStage, bool skipFailed, CancellationToken ct);
}
