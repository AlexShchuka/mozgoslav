using System;
using System.Linq;

using FluentAssertions;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Domain;

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
            nameof(JobStatus.PreflightChecks),
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
