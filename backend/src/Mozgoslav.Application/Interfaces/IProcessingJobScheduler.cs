namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-011 step 6 — port that the enqueue path (ImportRecordingUseCase,
/// POST /api/jobs) uses to hand off a <c>ProcessingJob</c> to the Quartz.NET
/// scheduler. Keeps the enqueue call-sites free of any Quartz surface area
/// so Application-layer code never references the library directly.
/// </summary>
public interface IProcessingJobScheduler
{
    /// <summary>
    /// Schedule a Quartz trigger that fires the recording-processing job for
    /// the given <paramref name="jobId"/> as soon as the scheduler has a free
    /// worker. Idempotent — re-scheduling the same id before the previous
    /// run fired is a no-op on the domain side; the scheduler replaces any
    /// existing trigger with identical identity.
    /// </summary>
    Task ScheduleAsync(Guid jobId, CancellationToken ct);
}
