namespace Mozgoslav.Domain.ValueObjects;

public sealed record TranscriptSegment(TimeSpan Start, TimeSpan End, string Text);
