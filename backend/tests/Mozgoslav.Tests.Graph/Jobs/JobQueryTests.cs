using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Jobs;

[TestClass]
public sealed class JobQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Jobs_ReturnsPaginatedResult()
    {
        var result = await ExecuteAsync(@"
{
  jobs(first: 10) {
    totalCount
    nodes {
      id
      recordingId
      profileId
      status
      progress
      createdAt
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}");

        result["data"]!["jobs"].Should().NotBeNull();
        result["data"]!["jobs"]!["totalCount"].Should().NotBeNull();
        result["data"]!["jobs"]!["nodes"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task ActiveJobs_ReturnsQueryable()
    {
        var result = await ExecuteAsync(@"
{
  activeJobs {
    id
    status
  }
}");

        result["data"]!["activeJobs"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task Job_ReturnsNullForUnknownId()
    {
        var result = await ExecuteAsync(@"
{
  job(id: ""00000000-0000-0000-0000-000000000000"") {
    id
    status
  }
}");

        result["data"]!.AsObject().ContainsKey("job").Should().BeTrue();
        result["data"]!["job"].Should().BeNull();
    }

    [TestMethod]
    public async Task EnqueueJob_ReturnsNotFoundForUnknownRecording()
    {
        var result = await ExecuteAsync(@"
mutation {
  enqueueJob(input: {
    recordingId: ""00000000-0000-0000-0000-000000000001""
    profileId: ""00000000-0000-0000-0000-000000000002""
  }) {
    job {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["enqueueJob"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["enqueueJob"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task CancelJob_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  cancelJob(id: ""00000000-0000-0000-0000-000000000001"") {
    errors {
      code
      message
    }
  }
}");

        result["data"]!["cancelJob"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["cancelJob"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
