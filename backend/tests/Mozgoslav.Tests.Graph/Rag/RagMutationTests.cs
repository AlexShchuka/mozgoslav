using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Rag;

[TestClass]
public sealed class RagMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task RagReindex_ReturnsResult()
    {
        var result = await ExecuteAsync(@"
mutation {
  ragReindex {
    embeddedNotes
    chunks
    errors {
      code
      message
    }
  }
}");

        result["data"]!["ragReindex"].Should().NotBeNull();
    }
}
