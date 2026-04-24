using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Notes;

[TestClass]
public sealed class NoteMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task DeleteNote_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  deleteNote(id: ""00000000-0000-0000-0000-000000000001"") {
    note {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["deleteNote"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["deleteNote"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task CreateNote_ReturnsValidationErrorForEmptyTitle()
    {
        var result = await ExecuteAsync(@"
mutation {
  createNote(input: { title: """" }) {
    note {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["createNote"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["createNote"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task CreateNote_ReturnsNoteOnSuccess()
    {
        var result = await ExecuteAsync(@"
mutation {
  createNote(input: { title: ""My Note"", body: ""Hello"" }) {
    note {
      id
      title
      source
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["createNote"]!["errors"]!.AsArray().Should().BeEmpty();
        result["data"]!["createNote"]!["note"]!["title"]!.GetValue<string>().Should().Be("My Note");
        result["data"]!["createNote"]!["note"]!["source"]!.GetValue<string>().Should().Be("MANUAL");
    }
}
