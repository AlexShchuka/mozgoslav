using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessingJobRepository
{
    Task<ProcessingJob> EnqueueAsync(ProcessingJob job, CancellationToken ct);
    Task<ProcessingJob?> DequeueNextAsync(CancellationToken ct);
    Task UpdateAsync(ProcessingJob job, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetAllAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct);

    /// <summary>
    /// Removes a queued job by id. Only jobs whose status is still <see cref="Mozgoslav.Domain.Enums.JobStatus.Queued"/>
    /// can be cancelled — in-flight jobs must complete or fail naturally.
    /// Returns <c>true</c> if a queued job was removed, <c>false</c> if the job is unknown or past the queued state.
    /// </summary>
    Task<bool> CancelQueuedAsync(Guid id, CancellationToken ct);
}
