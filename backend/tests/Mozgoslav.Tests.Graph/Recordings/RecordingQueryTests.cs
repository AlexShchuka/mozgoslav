using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Recordings;

[TestClass]
public sealed class RecordingQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Recordings_ReturnsPaginatedResult()
    {
        var result = await ExecuteAsync(@"
{
  recordings(first: 10) {
    totalCount
    nodes {
      id
      fileName
      status
      format
      sourceType
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}");

        result["data"]!["recordings"].Should().NotBeNull();
        result["data"]!["recordings"]!["totalCount"].Should().NotBeNull();
        result["data"]!["recordings"]!["nodes"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task Recording_ReturnsNullForUnknownId()
    {
        var result = await ExecuteAsync(@"
{
  recording(id: ""00000000-0000-0000-0000-000000000000"") {
    id
    fileName
  }
}");

        result["data"]!.AsObject().ContainsKey("recording").Should().BeTrue();
        result["data"]!["recording"].Should().BeNull();
    }

    [TestMethod]
    public async Task ImportRecordings_ReturnsValidationErrorForEmptyPaths()
    {
        var result = await ExecuteAsync(@"
mutation {
  importRecordings(input: { filePaths: [], profileId: null }) {
    recordings {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["importRecordings"]!["recordings"]!.AsArray().Should().BeEmpty();
        result["data"]!["importRecordings"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["importRecordings"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task ImportRecordings_ReturnsValidationErrorForNonExistentPath()
    {
        var result = await ExecuteAsync(@"
mutation {
  importRecordings(input: { filePaths: [""/nonexistent/file.mp3""], profileId: null }) {
    recordings {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["importRecordings"]!["recordings"]!.AsArray().Should().BeEmpty();
        result["data"]!["importRecordings"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["importRecordings"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task StopRecording_ReturnsNotFoundForUnknownSession()
    {
        var result = await ExecuteAsync(@"
mutation {
  stopRecording(sessionId: ""nonexistent-session"") {
    sessionId
    recordings {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["stopRecording"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["stopRecording"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
