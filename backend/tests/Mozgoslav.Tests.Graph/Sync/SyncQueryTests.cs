using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Sync;

[TestClass]
public sealed class SyncQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task SyncHealth_ReturnsBool()
    {
        var result = await ExecuteAsync(@"
{
  syncHealth
}");

        result["data"]!.AsObject().ContainsKey("syncHealth").Should().BeTrue();
    }

    [TestMethod]
    public async Task SyncStatus_ReturnsNullOrResult()
    {
        var result = await ExecuteAsync(@"
{
  syncStatus {
    folders {
      id
      state
      completionPct
    }
    devices {
      id
      name
      connected
    }
  }
}");

        result["data"]!.AsObject().ContainsKey("syncStatus").Should().BeTrue();
    }

    [TestMethod]
    public async Task SyncPairingPayload_ReturnsNullOrResult()
    {
        var result = await ExecuteAsync(@"
{
  syncPairingPayload {
    deviceId
    folderIds
    uri
  }
}");

        result["data"]!.AsObject().ContainsKey("syncPairingPayload").Should().BeTrue();
    }
}
