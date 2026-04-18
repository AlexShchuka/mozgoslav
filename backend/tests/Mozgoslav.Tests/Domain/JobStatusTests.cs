using FluentAssertions;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Domain;

/// <summary>
/// ADR-015 — the <see cref="JobStatus.Cancelled"/> value must survive the
/// EF Core enum-to-string value converter round-trip. The converter uses the
/// enum member name (not the ordinal), so int-ordering isn't load-bearing,
/// but we still place <c>Cancelled</c> at the end of the enum to be safe if
/// future callers read the int value.
/// </summary>
[TestClass]
public sealed class JobStatusTests
{
    [TestMethod]
    public void Cancelled_IsLastEnumMember_SoIntOrderingIsSafe()
    {
        var all = Enum.GetValues<JobStatus>();
        all.Last().Should().Be(JobStatus.Cancelled);
    }

    [TestMethod]
    public void Cancelled_ParsesFromItsName()
    {
        Enum.TryParse<JobStatus>("Cancelled", out var parsed).Should().BeTrue();
        parsed.Should().Be(JobStatus.Cancelled);
    }

    [TestMethod]
    public void Cancelled_RoundTripsThroughString()
    {
        var asString = JobStatus.Cancelled.ToString();
        Enum.Parse<JobStatus>(asString).Should().Be(JobStatus.Cancelled);
    }

    [TestMethod]
    public void EnumContainsAllExpectedMembers()
    {
        Enum.GetNames<JobStatus>().Should().BeEquivalentTo(
        [
            nameof(JobStatus.Queued),
            nameof(JobStatus.Transcribing),
            nameof(JobStatus.Correcting),
            nameof(JobStatus.Summarizing),
            nameof(JobStatus.Exporting),
            nameof(JobStatus.Done),
            nameof(JobStatus.Failed),
            nameof(JobStatus.Cancelled)
        ]);
    }
}
