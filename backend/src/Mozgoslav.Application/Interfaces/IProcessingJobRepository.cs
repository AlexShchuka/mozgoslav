using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// CRUD-level port over the <c>processing_jobs</c> table — the durable
/// business-state store the UI reads from (list / active / by-recording /
/// by-id). Queue semantics (dequeue, polling) moved to Quartz.NET in
/// ADR-011 step 6; this port only exposes the <see cref="GetByIdAsync"/> +
/// <see cref="GetByStatusAsync"/> lookups the startup rehydrator needs to
/// rebuild the trigger plan on boot.
/// </summary>
public interface IProcessingJobRepository
{
    Task<ProcessingJob> EnqueueAsync(ProcessingJob job, CancellationToken ct);
    Task<ProcessingJob?> GetByIdAsync(Guid id, CancellationToken ct);
    Task UpdateAsync(ProcessingJob job, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetAllAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByStatusAsync(JobStatus status, CancellationToken ct);

    /// <summary>
    /// ADR-015 — atomically flips <c>CancelRequested=true</c> on a single job
    /// without mutating any other column. Used by the cancel endpoint when the
    /// job is active; the worker observes the flag on its next loop iteration
    /// via the per-job <see cref="CancellationTokenSource"/> in the registry,
    /// and transitions the row to <see cref="JobStatus.Cancelled"/>.
    /// Returns <c>true</c> if a row was affected, <c>false</c> if the id is unknown.
    /// </summary>
    Task<bool> SetCancelRequestedAsync(Guid id, CancellationToken ct);
}
