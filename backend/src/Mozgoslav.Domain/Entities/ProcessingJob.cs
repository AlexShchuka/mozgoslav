using System;

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

    public string? UserHint { get; set; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    public bool CancelRequested { get; set; }
}
