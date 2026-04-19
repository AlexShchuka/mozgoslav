using System;
using System.Collections.Generic;

using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Domain.Entities;

public sealed class Transcript
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid RecordingId { get; init; }
    public string ModelUsed { get; init; } = string.Empty;
    public string Language { get; init; } = "ru";
    public string RawText { get; set; } = string.Empty;
    public List<TranscriptSegment> Segments { get; set; } = [];
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
