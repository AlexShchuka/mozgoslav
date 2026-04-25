using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Dictation;

[TestClass]
public sealed class DictationMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task DictationStart_ReturnsSessionId()
    {
        var result = await ExecuteAsync(@"
mutation {
  dictationStart(source: ""test"") {
    sessionId
    source
    errors {
      code
      message
    }
  }
}");

        result["data"]!["dictationStart"]!["errors"]!.AsArray().Should().BeEmpty();
        result["data"]!["dictationStart"]!["sessionId"].Should().NotBeNull();
        result["data"]!["dictationStart"]!["source"]!.GetValue<string>().Should().Be("test");
    }

    [TestMethod]
    public async Task DictationStop_ReturnsNotFoundForUnknownSession()
    {
        var result = await ExecuteAsync(@"
mutation {
  dictationStop(sessionId: ""00000000-0000-0000-0000-000000000001"") {
    rawText
    errors {
      code
      message
    }
  }
}");

        result["data"]!["dictationStop"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["dictationStop"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task DictationCancel_SucceedsForUnknownSession()
    {
        var result = await ExecuteAsync(@"
mutation {
  dictationCancel(sessionId: ""00000000-0000-0000-0000-000000000001"") {
    errors {
      code
    }
  }
}");

        result["data"]!["dictationCancel"]!["errors"]!.AsArray().Should().BeEmpty();
    }

    [TestMethod]
    public async Task DictationStart_WithRecordingId_ReturnsSessionIdAndNoErrors()
    {
        var recordingId = "a1b2c3d4-0000-0000-0000-000000000001";

        var result = await ExecuteAsync(
            "mutation { dictationStart(recordingId: \"" + recordingId + "\") { sessionId errors { code message } } }");

        result["data"]!["dictationStart"]!["errors"]!.AsArray().Should().BeEmpty();
        result["data"]!["dictationStart"]!["sessionId"].Should().NotBeNull();
    }
}
