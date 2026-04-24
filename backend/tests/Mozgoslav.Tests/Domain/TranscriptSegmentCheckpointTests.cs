using System;

using FluentAssertions;

using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public sealed class TranscriptSegmentCheckpointTests
{
    [TestMethod]
    public void TranscriptSegment_DefaultCheckpoint_IsNull()
    {
        var segment = new TranscriptSegment(
            Start: TimeSpan.FromSeconds(0),
            End: TimeSpan.FromSeconds(2),
            Text: "hi");

        segment.CheckpointAt.Should().BeNull();
    }

    [TestMethod]
    public void TranscriptSegment_WithCheckpoint_PreservesUtcTimestamp()
    {
        var stamp = DateTime.UtcNow;
        var segment = new TranscriptSegment(
            Start: TimeSpan.FromSeconds(10),
            End: TimeSpan.FromSeconds(12),
            Text: "hello",
            CheckpointAt: stamp);

        segment.CheckpointAt.Should().Be(stamp);
        segment.CheckpointAt!.Value.Kind.Should().Be(DateTimeKind.Utc);
    }
}
