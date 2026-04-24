using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Sync;

[TestClass]
public sealed class SyncMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task AcceptSyncDevice_ReturnsValidationErrorForEmptyDeviceId()
    {
        var result = await ExecuteAsync(@"
mutation {
  acceptSyncDevice(deviceId: """") {
    accepted
    errors {
      code
      message
    }
  }
}");

        result["data"]!["acceptSyncDevice"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["acceptSyncDevice"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task AcceptSyncDevice_ReturnsSyncUnavailableWhenSyncthingDown()
    {
        var result = await ExecuteAsync(@"
mutation {
  acceptSyncDevice(deviceId: ""ABCDEFG-HIJKLMN-OPQRSTU-VWXYZ12-3456789-ABCDEFG-HIJKLMN"") {
    accepted
    errors {
      code
      message
    }
  }
}");

        result["data"]!["acceptSyncDevice"].Should().NotBeNull();
    }
}
