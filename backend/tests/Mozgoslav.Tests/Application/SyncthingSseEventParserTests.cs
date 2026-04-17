using FluentAssertions;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// Test list (ADR-003 D5 — SSE/long-poll event parser):
///  - ParseBatch_FolderCompletion_MapsPayload
///  - ParseBatch_DeviceConnected_And_Disconnected_SetConnectedFlag
///  - ParseBatch_PendingDevicesChanged_MapsAddedEntries
///  - ParseBatch_ItemFinished_WithConflictPath_SetsFileConflict
///  - ParseBatch_ItemFinished_WithoutConflictPath_NoFileConflictSet
///  - ParseBatch_UnknownType_PassesThroughWithRawJson
///  - ParseBatch_MalformedEntry_IsSilentlySkipped
///  - Parse_NonObjectInput_ReturnsNull
///  - ParseBatch_EmptyArray_ReturnsEmpty
/// </summary>
[TestClass]
public sealed class SyncthingSseEventParserTests
{
    [TestMethod]
    public void ParseBatch_FolderCompletion_MapsPayload()
    {
        const string json = """
            [{
              "id": 42,
              "type": "FolderCompletion",
              "time": "2026-04-16T12:34:56.789Z",
              "data": {
                "folder": "mozgoslav-notes",
                "device": "AAAA-BBBB-CCCC",
                "completion": 87.5,
                "needBytes": 1024,
                "globalBytes": 8192
              }
            }]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed.Should().HaveCount(1);
        parsed[0].Type.Should().Be("FolderCompletion");
        parsed[0].Id.Should().Be(42);
        parsed[0].FolderCompletion.Should().NotBeNull();
        parsed[0].FolderCompletion!.Folder.Should().Be("mozgoslav-notes");
        parsed[0].FolderCompletion!.Device.Should().Be("AAAA-BBBB-CCCC");
        parsed[0].FolderCompletion!.Completion.Should().Be(87.5);
        parsed[0].FolderCompletion!.NeedBytes.Should().Be(1024);
        parsed[0].FolderCompletion!.GlobalBytes.Should().Be(8192);
    }

    [TestMethod]
    public void ParseBatch_DeviceConnected_And_Disconnected_SetConnectedFlag()
    {
        const string json = """
            [
              {"id":1,"type":"DeviceConnected","time":"2026-04-16T12:00:00Z","data":{"id":"PEER1","addr":"192.168.1.5:22000"}},
              {"id":2,"type":"DeviceDisconnected","time":"2026-04-16T12:05:00Z","data":{"id":"PEER1","error":"conn reset"}}
            ]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed.Should().HaveCount(2);
        parsed[0].DeviceConnection!.Connected.Should().BeTrue();
        parsed[0].DeviceConnection!.DeviceId.Should().Be("PEER1");
        parsed[0].DeviceConnection!.Address.Should().Be("192.168.1.5:22000");
        parsed[1].DeviceConnection!.Connected.Should().BeFalse();
        parsed[1].DeviceConnection!.Error.Should().Be("conn reset");
    }

    [TestMethod]
    public void ParseBatch_PendingDevicesChanged_MapsAddedEntries()
    {
        const string json = """
            [{
              "id": 3,
              "type": "PendingDevicesChanged",
              "time": "2026-04-16T12:10:00Z",
              "data": {
                "added": [
                  {"deviceID": "NEW-PHONE-ID", "name": "alex-phone", "address": "dynamic"}
                ],
                "removed": []
              }
            }]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed[0].PendingDevices.Should().NotBeNull();
        parsed[0].PendingDevices!.Added.Should().HaveCount(1);
        parsed[0].PendingDevices!.Added[0].DeviceId.Should().Be("NEW-PHONE-ID");
        parsed[0].PendingDevices!.Added[0].Name.Should().Be("alex-phone");
        parsed[0].PendingDevices!.Removed.Should().BeEmpty();
    }

    [TestMethod]
    public void ParseBatch_ItemFinished_WithConflictPath_SetsFileConflict()
    {
        const string json = """
            [{
              "id": 4,
              "type": "ItemFinished",
              "time": "2026-04-16T12:15:00Z",
              "data": {
                "folder": "mozgoslav-notes",
                "item": "2026-04-16 meeting.sync-conflict-20260416-123412-ABCDEF.md",
                "action": "update"
              }
            }]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed[0].FileConflict.Should().NotBeNull();
        parsed[0].FileConflict!.Folder.Should().Be("mozgoslav-notes");
        parsed[0].FileConflict!.Path.Should().Contain(".sync-conflict-");
    }

    [TestMethod]
    public void ParseBatch_ItemFinished_WithoutConflictPath_NoFileConflictSet()
    {
        const string json = """
            [{
              "id": 5,
              "type": "ItemFinished",
              "time": "2026-04-16T12:16:00Z",
              "data": { "folder": "mozgoslav-notes", "item": "note.md" }
            }]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed[0].FileConflict.Should().BeNull();
    }

    [TestMethod]
    public void ParseBatch_UnknownType_PassesThroughWithRawJson()
    {
        const string json = """
            [{"id":99,"type":"SomeNewEventKind","time":"2026-04-16T12:20:00Z","data":{"foo":"bar"}}]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed.Should().HaveCount(1);
        parsed[0].Type.Should().Be("SomeNewEventKind");
        parsed[0].RawJson.Should().Contain("SomeNewEventKind");
        parsed[0].FolderCompletion.Should().BeNull();
        parsed[0].DeviceConnection.Should().BeNull();
    }

    [TestMethod]
    public void ParseBatch_MalformedEntry_IsSilentlySkipped()
    {
        // Missing the upstream-required "id" → entry dropped, rest preserved.
        const string json = """
            [
              {"type":"NoId"},
              {"id":7,"type":"DeviceConnected","time":"2026-04-16T12:25:00Z","data":{"id":"PEER"}}
            ]
            """;

        var parsed = SyncthingSseEventParser.ParseBatch(json);

        parsed.Should().HaveCount(1);
        parsed[0].Id.Should().Be(7);
    }

    [TestMethod]
    public void ParseBatch_EmptyArray_ReturnsEmpty()
    {
        SyncthingSseEventParser.ParseBatch("[]").Should().BeEmpty();
    }

    [TestMethod]
    public void Parse_NonObjectInput_ReturnsNull()
    {
        using var doc = System.Text.Json.JsonDocument.Parse("\"not an event\"");
        SyncthingSseEventParser.Parse(doc.RootElement).Should().BeNull();
    }
}
