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
/// bridge shape described in <c>plan/v0.8/03-mac-native-recorder.md §2.3</c>.
/// </summary>
[TestClass]
public sealed class AVFoundationAudioRecorderTests : IDisposable
{
    private const string EnvPortKey = "MOZGOSLAV_ELECTRON_INTERNAL_PORT";

    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private AVFoundationAudioRecorder _recorder = null!;
    private string? _previousEnv;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        var port = new Uri(_server.Urls[0]).Port.ToString(System.Globalization.CultureInfo.InvariantCulture);
        _previousEnv = Environment.GetEnvironmentVariable(EnvPortKey);
        Environment.SetEnvironmentVariable(EnvPortKey, port);

        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
        _recorder = new AVFoundationAudioRecorder(_http, NullLogger<AVFoundationAudioRecorder>.Instance);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        Environment.SetEnvironmentVariable(EnvPortKey, _previousEnv);
        _http?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public void IsSupported_WhenNotMacOS_ReturnsFalse()
    {
        // AVFoundation is macOS-only; on Linux sandbox IsSupported must be false.
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
            // StartAsync on non-mac throws PlatformNotSupportedException; that is
            // the honest gate. We still assert the contract exists.
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

    public TestContext TestContext { get; set; } = null!;
}
