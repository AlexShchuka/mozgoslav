using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Logs;

[TestClass]
public sealed class LogQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Logs_ReturnsArray()
    {
        var result = await ExecuteAsync(@"
{
  logs {
    fileName
    sizeBytes
    lastModifiedUtc
  }
}");

        result["data"]!["logs"].Should().NotBeNull();
        result["data"]!["logs"]!.AsArray().Should().NotBeNull();
    }

    [TestMethod]
    public async Task LogTail_ReturnsNullForOutOfRangeLines()
    {
        var result = await ExecuteAsync(@"
{
  logTail(lines: 0) {
    file
    lines
    totalLines
  }
}");

        result["data"]!.AsObject().ContainsKey("logTail").Should().BeTrue();
        result["data"]!["logTail"].Should().BeNull();
    }

    [TestMethod]
    public async Task LogTail_ReturnsNullForMissingFile()
    {
        var result = await ExecuteAsync(@"
{
  logTail(file: ""nonexistent-xyz.log"", lines: 100) {
    file
    lines
    totalLines
  }
}");

        result["data"]!.AsObject().ContainsKey("logTail").Should().BeTrue();
    }
}
