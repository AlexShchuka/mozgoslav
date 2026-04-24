using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Notes;

[TestClass]
public sealed class NoteQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Notes_ReturnsPaginatedResult()
    {
        var result = await ExecuteAsync(@"
{
  notes(first: 10) {
    totalCount
    nodes {
      id
      topic
      summary
      createdAt
      exportedToVault
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}");

        result["data"]!["notes"].Should().NotBeNull();
        result["data"]!["notes"]!["totalCount"].Should().NotBeNull();
        result["data"]!["notes"]!["nodes"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task Note_ReturnsNullForUnknownId()
    {
        var result = await ExecuteAsync(@"
{
  note(id: ""00000000-0000-0000-0000-000000000000"") {
    id
    topic
  }
}");

        result["data"]!.AsObject().ContainsKey("note").Should().BeTrue();
        result["data"]!["note"].Should().BeNull();
    }

    [TestMethod]
    public async Task ExportNote_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  exportNote(id: ""00000000-0000-0000-0000-000000000001"") {
    note {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["exportNote"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["exportNote"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
