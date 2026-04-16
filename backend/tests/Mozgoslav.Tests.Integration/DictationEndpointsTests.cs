using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// End-to-end tests for the /api/dictation/* surface. Whisper.net itself cannot
/// run without a real model on disk, so these tests focus on the session
/// lifecycle and the state machine observable through HTTP: start, duplicate
/// start, push, cancel, 404 on unknown session. The full audio → text path is
/// covered by unit tests with a fake streaming service.
/// </summary>
[TestClass]
public sealed class DictationEndpointsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Start_ReturnsSessionId()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);
        body.Should().NotBeNull();
        body.SessionId.Should().NotBeEmpty();

        // cleanup: otherwise Whisper.net would be invoked on stop (no model available).
        await client.PostAsync($"/api/dictation/cancel/{body.SessionId}", content: null, TestContext.CancellationToken);
    }

    [TestMethod]
    public async Task Start_WhenSessionAlreadyActive_ReturnsConflict()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var first = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstBody = await first.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);

        using var second = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);

        await client.PostAsync($"/api/dictation/cancel/{firstBody!.SessionId}", content: null, TestContext.CancellationToken);
    }

    [TestMethod]
    public async Task Push_UnknownSession_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var payload = new
        {
            samples = new[] { 0.1f, 0.2f },
            sampleRate = 16_000,
            offsetSeconds = 0.0
        };
        using var response = await client.PostAsJsonAsync(
            $"/api/dictation/push/{Guid.NewGuid()}", payload, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Push_EmptySamples_Returns400()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var start = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        var session = await start.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);

        var payload = new
        {
            samples = Array.Empty<float>(),
            sampleRate = 16_000,
            offsetSeconds = 0.0
        };
        using var response = await client.PostAsJsonAsync(
            $"/api/dictation/push/{session!.SessionId}", payload, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        await client.PostAsync($"/api/dictation/cancel/{session.SessionId}", content: null, TestContext.CancellationToken);
    }

    [TestMethod]
    public async Task Cancel_ClearsActiveSessionAndAllowsNewStart()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var start1 = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        var first = await start1.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);

        using var cancel = await client.PostAsync(
            $"/api/dictation/cancel/{first!.SessionId}", content: null, TestContext.CancellationToken);
        cancel.StatusCode.Should().Be(HttpStatusCode.OK);

        using var start2 = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        start2.StatusCode.Should().Be(HttpStatusCode.OK);
        var second = await start2.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);
        second!.SessionId.Should().NotBe(first.SessionId);

        await client.PostAsync($"/api/dictation/cancel/{second.SessionId}", content: null, TestContext.CancellationToken);
    }

    [TestMethod]
    public async Task Cancel_UnknownSession_ReturnsOk()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            $"/api/dictation/cancel/{Guid.NewGuid()}", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [TestMethod]
    public async Task Stream_UnknownSession_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync($"/api/dictation/stream/{Guid.NewGuid()}", TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Stop_UnknownSession_Returns404()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        using var response = await client.PostAsync(
            $"/api/dictation/stop/{Guid.NewGuid()}", content: null, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed record StartResponse(Guid SessionId);

    public TestContext TestContext { get; set; }
}
