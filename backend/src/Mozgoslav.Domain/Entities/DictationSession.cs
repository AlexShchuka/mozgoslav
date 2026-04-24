using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class DictationSession
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DictationState State { get; set; } = DictationState.Recording;
    public DateTime StartedAt { get; init; } = DateTime.UtcNow;
    public DateTime? FinishedAt { get; set; }

    public string? Source { get; init; }
}
