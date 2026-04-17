using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.Syncthing;

/// <summary>
/// ADR-003 D3: WireMock-backed contract test — covers every Syncthing REST
/// endpoint our <see cref="SyncthingHttpClient"/> talks to.
///
/// Test list:
///  - IsHealthyAsync_Get_SystemStatus_200_ReturnsTrue
///  - GetLocalDeviceIdAsync_Get_SystemStatus_ReturnsMyID
///  - GetStatusAsync_Get_ConfigFolders_And_DbStatus_MapsCompletion
///  - GetStatusAsync_Get_SystemConnections_MapsDevices
///  - StreamEventsAsync_Get_Events_YieldsParsedEnvelopes_And_TracksLastId
///  - AcceptPendingDeviceAsync_Post_ClusterPendingDevices_WithBodyAndAutoAccept
///  - ShutdownAsync_Post_SystemShutdown_Returns200
///  - GetConfigAsync_Returns_RawJson
///  - ReplaceConfigAsync_Put_SystemConfig_BodyForwardedVerbatim
///  - ApiKeyHeader_IsAttached_ToEveryRequest
/// </summary>
[TestClass]
public sealed class SyncthingHttpClientTests : IDisposable
{
    private const string ApiKey = "integration-test-key";

    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
        _http.DefaultRequestHeaders.Add("X-API-Key", ApiKey);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }
        _disposed = true;
        _http?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public async Task IsHealthyAsync_Get_SystemStatus_200_ReturnsTrue()
    {
        _server.Given(Request.Create().WithPath("/rest/system/status").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { myID = "DEVICE-ID" }));
        var client = NewClient();

        var healthy = await client.IsHealthyAsync(CancellationToken.None);

        healthy.Should().BeTrue();
    }

    [TestMethod]
    public async Task GetLocalDeviceIdAsync_Get_SystemStatus_ReturnsMyID()
    {
        _server.Given(Request.Create().WithPath("/rest/system/status").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { myID = "THIS-IS-OUR-DEVICE" }));
        var client = NewClient();

        var id = await client.GetLocalDeviceIdAsync(CancellationToken.None);

        id.Should().Be("THIS-IS-OUR-DEVICE");
    }

    [TestMethod]
    public async Task GetStatusAsync_Get_ConfigFolders_And_DbStatus_MapsCompletion()
    {
        _server.Given(Request.Create().WithPath("/rest/config/folders").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new[]
            {
                new { id = "mozgoslav-notes", label = "Notes" },
            }));

        _server.Given(Request.Create().WithPath("/rest/db/status").WithParam("folder", "mozgoslav-notes").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new
            {
                state = "idle",
                globalBytes = 1000L,
                needBytes = 250L,
            }));

        _server.Given(Request.Create().WithPath("/rest/system/connections").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { connections = new Dictionary<string, object>() }));

        var client = NewClient();
        var status = await client.GetStatusAsync(CancellationToken.None);

        status.Folders.Should().HaveCount(1);
        status.Folders[0].Id.Should().Be("mozgoslav-notes");
        status.Folders[0].State.Should().Be("idle");
        status.Folders[0].CompletionPct.Should().BeApproximately(75.0, 0.5);
    }

    [TestMethod]
    public async Task GetStatusAsync_Get_SystemConnections_MapsDevices()
    {
        _server.Given(Request.Create().WithPath("/rest/config/folders").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(Array.Empty<object>()));
        _server.Given(Request.Create().WithPath("/rest/system/connections").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new
            {
                connections = new Dictionary<string, object>
                {
                    ["PEER-ID"] = new { connected = true, clientVersion = "v1.28", connectedAt = "2026-04-16T12:00:00Z" },
                },
            }));

        var client = NewClient();
        var status = await client.GetStatusAsync(CancellationToken.None);

        status.Devices.Should().HaveCount(1);
        status.Devices[0].Id.Should().Be("PEER-ID");
        status.Devices[0].Connected.Should().BeTrue();
        status.Devices[0].Name.Should().Be("v1.28");
    }

    [TestMethod]
    public async Task StreamEventsAsync_Get_Events_YieldsParsedEnvelopes_And_TracksLastId()
    {
        _server.Given(Request.Create().WithPath("/rest/events").WithParam("since", "0").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBody("""
                [{"id":10,"type":"DeviceConnected","time":"2026-04-16T12:00:00Z","data":{"id":"PEER"}}]
                """));
        _server.Given(Request.Create().WithPath("/rest/events").WithParam("since", "10").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBody("""
                [{"id":11,"type":"FolderCompletion","time":"2026-04-16T12:00:01Z","data":{"folder":"mozgoslav-notes","device":"PEER","completion":100.0,"globalBytes":1,"needBytes":0}}]
                """));

        var client = NewClient();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        var seen = new List<SyncthingEvent>();
        await foreach (var evt in client.StreamEventsAsync(cts.Token))
        {
            seen.Add(evt);
            if (seen.Count == 2)
            {
                await cts.CancelAsync();
                break;
            }
        }

        seen.Should().HaveCount(2);
        seen[0].Type.Should().Be("DeviceConnected");
        seen[1].Type.Should().Be("FolderCompletion");
        seen[1].FolderCompletion!.Folder.Should().Be("mozgoslav-notes");
    }

    [TestMethod]
    public async Task AcceptPendingDeviceAsync_Post_ClusterPendingDevices_WithBodyAndAutoAccept()
    {
        _server.Given(Request.Create()
                .WithPath("/rest/cluster/pending/devices")
                .WithParam("device", "NEW-PHONE")
                .UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));

        var client = NewClient();

        await client.AcceptPendingDeviceAsync(
            deviceId: "NEW-PHONE",
            deviceName: "alex-phone",
            folderIds: ["mozgoslav-recordings", "mozgoslav-notes"],
            CancellationToken.None);

        var request = _server.LogEntries.Should().ContainSingle(e =>
            e.RequestMessage.Method == "POST" && e.RequestMessage.Path == "/rest/cluster/pending/devices")
            .Subject;
        var body = request.RequestMessage.Body ?? string.Empty;
        body.Should().Contain("NEW-PHONE");
        body.Should().Contain("alex-phone");
        body.Should().Contain("autoAcceptFolders");
    }

    [TestMethod]
    public async Task ShutdownAsync_Post_SystemShutdown_Returns200()
    {
        _server.Given(Request.Create().WithPath("/rest/system/shutdown").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { ok = "shutting down" }));
        var client = NewClient();

        await client.ShutdownAsync(CancellationToken.None);

        _server.LogEntries.Should().Contain(e =>
            e.RequestMessage.Method == "POST" && e.RequestMessage.Path == "/rest/system/shutdown");
    }

    [TestMethod]
    public async Task GetConfigAsync_Returns_RawJson()
    {
        const string ConfigJson = """{"version":37,"folders":[{"id":"mozgoslav-notes"}],"devices":[]}""";
        _server.Given(Request.Create().WithPath("/rest/system/config").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithHeader("Content-Type", "application/json").WithBody(ConfigJson));
        var client = NewClient();

        var body = await client.GetConfigAsync(CancellationToken.None);

        body.Should().Be(ConfigJson);
    }

    [TestMethod]
    public async Task ReplaceConfigAsync_Put_SystemConfig_BodyForwardedVerbatim()
    {
        _server.Given(Request.Create().WithPath("/rest/system/config").UsingPut())
            .RespondWith(Response.Create().WithStatusCode(200));
        var client = NewClient();

        const string Updated = """{"version":37,"folders":[],"devices":[]}""";
        await client.ReplaceConfigAsync(Updated, CancellationToken.None);

        var put = _server.LogEntries.Should().ContainSingle(e =>
            e.RequestMessage.Method == "PUT" && e.RequestMessage.Path == "/rest/system/config")
            .Subject;
        (put.RequestMessage.Body ?? string.Empty).Should().Be(Updated);
    }

    [TestMethod]
    public async Task ApiKeyHeader_IsAttached_ToEveryRequest()
    {
        _server.Given(Request.Create().WithPath("/rest/system/status").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { myID = "D" }));
        var client = NewClient();

        await client.IsHealthyAsync(CancellationToken.None);

        var entry = _server.LogEntries.Single();
        entry.RequestMessage.Headers.Should().ContainKey("X-API-Key");
        string.Join(",", entry.RequestMessage.Headers!["X-API-Key"]).Should().Be(ApiKey);
    }

    private SyncthingHttpClient NewClient() =>
        new(_http, NullLogger<SyncthingHttpClient>.Instance);
}
