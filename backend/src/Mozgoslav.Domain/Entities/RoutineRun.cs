using System;

namespace Mozgoslav.Domain.Entities;

public sealed class RoutineRun
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string RoutineKey { get; init; } = string.Empty;
    public DateTimeOffset StartedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }
    public string Status { get; set; } = "Running";
    public string? ErrorMessage { get; set; }
    public string? PayloadSummary { get; set; }
}
