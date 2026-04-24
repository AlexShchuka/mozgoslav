using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Obsidian;

[TestClass]
public sealed class ObsidianQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task ObsidianDetect_ReturnsDetectionResult()
    {
        var result = await ExecuteAsync(@"
{
  obsidianDetect {
    detected {
      path
      name
    }
    searched
  }
}");

        result["data"]!["obsidianDetect"].Should().NotBeNull();
        result["data"]!["obsidianDetect"]!["detected"].Should().NotBeNull();
        result["data"]!["obsidianDetect"]!["searched"].Should().NotBeNull();
    }
}
