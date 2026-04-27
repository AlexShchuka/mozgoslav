using System;
using System.Collections.Generic;

using FluentAssertions;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Tests.Rag;

[TestClass]
public sealed class MetadataFilterTests
{
    [TestMethod]
    public void MetadataFilter_NullFilter_AllowsAll()
    {
        MetadataFilter? filter = null;

        filter.Should().BeNull();
    }

    [TestMethod]
    public void MetadataFilter_DateRange_ConstructsCorrectly()
    {
        var from = new DateTimeOffset(2024, 3, 1, 0, 0, 0, TimeSpan.Zero);
        var to = new DateTimeOffset(2024, 3, 31, 23, 59, 59, TimeSpan.Zero);

        var filter = new MetadataFilter(
            FromUtc: from,
            ToUtc: to,
            ProfileIds: null,
            SpeakerIds: null);

        filter.FromUtc.Should().Be(from);
        filter.ToUtc.Should().Be(to);
        filter.ProfileIds.Should().BeNull();
        filter.SpeakerIds.Should().BeNull();
    }

    [TestMethod]
    public void MetadataFilter_WithProfileIds_ConstructsCorrectly()
    {
        var profileIds = new List<string> { "profile-a", "profile-b" };

        var filter = new MetadataFilter(
            FromUtc: null,
            ToUtc: null,
            ProfileIds: profileIds,
            SpeakerIds: null);

        filter.ProfileIds.Should().BeEquivalentTo(profileIds);
    }

    [TestMethod]
    public void MetadataFilter_WithSpeakerIds_ConstructsCorrectly()
    {
        var speakerIds = new List<string> { "A", "B" };

        var filter = new MetadataFilter(
            FromUtc: null,
            ToUtc: null,
            ProfileIds: null,
            SpeakerIds: speakerIds);

        filter.SpeakerIds.Should().BeEquivalentTo(speakerIds);
    }

    [TestMethod]
    public void RetrievalQuery_WithFilter_IsImmutable()
    {
        var filter = new MetadataFilter(
            FromUtc: DateTimeOffset.UtcNow.AddDays(-30),
            ToUtc: null,
            ProfileIds: null,
            SpeakerIds: null);

        var query = new RetrievalQuery("search text", TopK: 10, Filter: filter);

        query.Query.Should().Be("search text");
        query.TopK.Should().Be(10);
        query.Filter.Should().Be(filter);
    }
}
