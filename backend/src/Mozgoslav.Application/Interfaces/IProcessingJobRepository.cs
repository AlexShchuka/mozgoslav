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
    /// Cancels a job at any life-cycle stage per ADR-006 D-9: queued jobs are
    /// removed outright, in-flight jobs are marked <see cref="Mozgoslav.Domain.Enums.JobStatus.Failed"/>
    /// with <c>"Cancelled by user"</c> and <c>FinishedAt</c> stamped so the
    /// running worker surfaces the termination. Terminal jobs (Done / Failed)
    /// are left untouched.
    /// </summary>
    Task<CancelJobResult> CancelAsync(Guid id, CancellationToken ct);
}

public enum CancelJobResult
{
    NotFound,
    RemovedFromQueue,
    MarkedFailed,
    AlreadyTerminal
}
