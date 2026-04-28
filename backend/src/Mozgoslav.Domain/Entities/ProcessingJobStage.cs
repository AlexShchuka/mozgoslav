using System;

namespace Mozgoslav.Domain.Entities;

public sealed class ProcessingJobStage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid JobId { get; init; }
    public string StageName { get; init; } = string.Empty;
    public DateTimeOffset StartedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }
    public int? DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
}
