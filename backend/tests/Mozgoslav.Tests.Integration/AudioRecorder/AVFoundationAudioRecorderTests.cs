using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.AudioRecorder;

/// <summary>
/// Contract tests for <see cref="AVFoundationAudioRecorder"/> against a
/// WireMock bridge. We do not run AVFoundation in CI (the Linux sandbox has
/// no audio hardware); instead we assert the backend-to-Electron loopback
/// bridge shape. Port is injected directly via constructor — no env vars,
/// so test parallelism is safe.
/// </summary>
[TestClass]
public sealed class AVFoundationAudioRecorderTests : IDisposable
{
    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private AVFoundationAudioRecorder _recorder = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        var port = new Uri(_server.Urls[0]).Port;

        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
        _recorder = new AVFoundationAudioRecorder(
            _http,
            NullLogger<AVFoundationAudioRecorder>.Instance,
            port);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _http?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public void IsSupported_WhenNotMacOS_ReturnsFalse()
    {
        if (OperatingSystem.IsMacOS())
        {
            Assert.Inconclusive("Skipping on macOS — different code path covered in Mac validation.");
            return;
        }
        _recorder.IsSupported.Should().BeFalse();
    }

    [TestMethod]
    public async Task StartAsync_PostsToBridgeAndRemembersSession()
    {
        if (!OperatingSystem.IsMacOS())
        {
            var nonMacAct = () => _recorder.StartAsync("/tmp/out.wav", TestContext.CancellationToken);
            await nonMacAct.Should().ThrowAsync<PlatformNotSupportedException>();
            return;
        }

        _server.Given(Request.Create().WithPath("/_internal/record/start").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"sessionId":"abc-123"}"""));

        await _recorder.StartAsync("/tmp/out.wav", TestContext.CancellationToken);
        _recorder.IsRecording.Should().BeTrue();
    }

    [TestMethod]
    public async Task StopAsync_WithoutActiveSession_Throws()
    {
        var act = () => _recorder.StopAsync(TestContext.CancellationToken);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [TestMethod]
    public async Task StartAsync_LogsHandoffMarker_ForD1Diagnostics()
    {
        if (!OperatingSystem.IsMacOS())
        {
            return;
        }

        var messages = new System.Collections.Concurrent.ConcurrentQueue<string>();
        var loggingRecorder = new AVFoundationAudioRecorder(
            _http,
            new CapturingLogger<AVFoundationAudioRecorder>(messages),
            new Uri(_server.Urls[0]).Port);

        _server.Given(Request.Create().WithPath("/_internal/record/start").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"sessionId":"abc-123"}"""));

        await loggingRecorder.StartAsync("/tmp/out.wav", TestContext.CancellationToken);

        var lines = messages.ToArray();
        lines.Should().Contain(line => line.Contains("D1 handoff", StringComparison.Ordinal));
    }

    public TestContext TestContext { get; set; } = null!;
}
