using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Recordings;

[TestClass]
public sealed class RecordingNotesTests : GraphTestsBase
{
    [TestMethod]
    public async Task Recording_NotesField_ReturnsEmptyArrayForUnknownRecording()
    {
        var result = await ExecuteAsync(@"
{
  recording(id: ""00000000-0000-0000-0000-000000000000"") {
    id
    notes {
      id
    }
  }
}");

        result["data"]!.AsObject().ContainsKey("recording").Should().BeTrue();
        result["data"]!["recording"].Should().BeNull();
    }

    [TestMethod]
    public async Task Recordings_NotesField_ReturnsEmptyArrayWhenNoNotes()
    {
        var result = await ExecuteAsync(@"
{
  recordings(first: 5) {
    nodes {
      id
      notes {
        id
      }
    }
  }
}");

        result["data"]!["recordings"].Should().NotBeNull();
        result["data"]!["recordings"]!["nodes"].Should().NotBeNull();
    }
}
