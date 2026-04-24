using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Recordings;

[TestClass]
public sealed class RecordingMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task DeleteRecording_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  deleteRecording(id: ""00000000-0000-0000-0000-000000000001"") {
    recording {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["deleteRecording"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["deleteRecording"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
