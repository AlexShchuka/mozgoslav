using System;
using System.Threading;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class ProcessingJob
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid RecordingId { get; init; }
    public Guid ProfileId { get; init; }
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public int Progress { get; set; }
    public string? CurrentStep { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Optional one-sentence user-supplied context appended to the LLM prompt,
    /// e.g. "meeting about Q2 planning, speakers: Ivan, Olga".
    /// </summary>
    public string? UserHint { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    /// <summary>
    /// ADR-015 — set to <c>true</c> by the cancel endpoint. The queue worker
    /// reads this flag on dequeue (so Queued cancels are honoured immediately)
    /// and the per-job <see cref="CancellationTokenSource"/> in
    /// <c>IJobCancellationRegistry</c> delivers cooperative cancellation to
    /// the in-flight pipeline. Defaults to <c>false</c>.
    /// </summary>
    public bool CancelRequested { get; set; }
}
