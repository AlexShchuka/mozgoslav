using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Dictation;

[TestClass]
public sealed class DictationQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task DictationAudioCapabilities_ReturnsCapabilities()
    {
        var result = await ExecuteAsync(@"
{
  dictationAudioCapabilities {
    isSupported
    detectedPlatform
    permissionsRequired
  }
}");

        result["data"]!["dictationAudioCapabilities"].Should().NotBeNull();
        result["data"]!["dictationAudioCapabilities"]!["isSupported"].Should().NotBeNull();
        result["data"]!["dictationAudioCapabilities"]!["detectedPlatform"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task DictationStatus_ReturnsNullForUnknownSession()
    {
        var result = await ExecuteAsync(@"
{
  dictationStatus(sessionId: ""00000000-0000-0000-0000-000000000001"") {
    sessionId
    state
  }
}");

        result["data"]!.AsObject().ContainsKey("dictationStatus").Should().BeTrue();
        result["data"]!["dictationStatus"].Should().BeNull();
    }
}
