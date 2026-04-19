using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class Recording
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string FileName { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public string Sha256 { get; init; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public AudioFormat Format { get; init; }
    public SourceType SourceType { get; init; }
    public RecordingStatus Status { get; set; } = RecordingStatus.New;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
