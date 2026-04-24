using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Rag;

[TestClass]
public sealed class RagStatusTests : GraphTestsBase
{
    [TestMethod]
    public async Task RagStatus_ReturnsZeroCountsOnEmptyDb()
    {
        var result = await ExecuteAsync(@"
{
  ragStatus {
    embeddedNotes
    chunks
  }
}");

        result["data"]!["ragStatus"].Should().NotBeNull();
        result["data"]!["ragStatus"]!["embeddedNotes"]!.GetValue<int>().Should().Be(0);
        result["data"]!["ragStatus"]!["chunks"]!.GetValue<int>().Should().Be(0);
    }
}
