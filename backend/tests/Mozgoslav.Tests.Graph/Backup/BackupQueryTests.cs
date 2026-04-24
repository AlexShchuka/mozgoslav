using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Backup;

[TestClass]
public sealed class BackupQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Backups_ReturnsArray()
    {
        var result = await ExecuteAsync(@"
{
  backups {
    name
    path
    sizeBytes
    createdAt
  }
}");

        result["data"]!["backups"].Should().NotBeNull();
        result["data"]!["backups"]!.AsArray().Should().NotBeNull();
    }
}
