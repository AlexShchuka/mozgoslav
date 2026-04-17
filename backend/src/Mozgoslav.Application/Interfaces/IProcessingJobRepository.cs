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
}
