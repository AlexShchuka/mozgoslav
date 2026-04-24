using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Backup;

[TestClass]
public sealed class BackupMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task CreateBackup_CreatesBackupSuccessfully()
    {
        var result = await ExecuteAsync(@"
mutation {
  createBackup {
    backup {
      name
      sizeBytes
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["createBackup"].Should().NotBeNull();
    }
}
