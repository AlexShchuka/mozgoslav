using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Rag;

[TestClass]
public sealed class RagQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task RagQuery_ReturnsNullForEmptyQuestion()
    {
        var result = await ExecuteAsync(@"
{
  ragQuery(question: """") {
    answer
    llmAvailable
  }
}");

        result["data"]!.AsObject().ContainsKey("ragQuery").Should().BeTrue();
        result["data"]!["ragQuery"].Should().BeNull();
    }

    [TestMethod]
    public async Task RagQuery_ReturnsResultForQuestion()
    {
        var result = await ExecuteAsync(@"
{
  ragQuery(question: ""test"", topK: 3) {
    answer
    citations {
      noteId
      segmentId
      text
      snippet
    }
    llmAvailable
  }
}");

        result["data"]!["ragQuery"].Should().NotBeNull();
    }
}
