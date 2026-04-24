using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Meetily;

[TestClass]
public sealed class MeetilyMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task ImportFromMeetily_ReturnsValidationErrorForEmptyPath()
    {
        var result = await ExecuteAsync(@"
mutation {
  importFromMeetily(meetilyDatabasePath: """") {
    totalMeetings
    importErrors
    errors {
      code
      message
    }
  }
}");

        result["data"]!["importFromMeetily"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["importFromMeetily"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task ImportFromMeetily_ReturnsNotFoundForMissingFile()
    {
        var result = await ExecuteAsync(@"
mutation {
  importFromMeetily(meetilyDatabasePath: ""/nonexistent/path/db.sqlite"") {
    totalMeetings
    importErrors
    errors {
      code
      message
    }
  }
}");

        result["data"]!["importFromMeetily"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["importFromMeetily"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
