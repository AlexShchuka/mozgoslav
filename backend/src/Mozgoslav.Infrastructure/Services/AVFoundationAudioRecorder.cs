using System.Net.Http.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Configuration;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// macOS native audio recorder. Delegates capture to the Swift helper
/// (<c>helpers/MozgoslavDictationHelper</c>) via an internal loopback HTTP
/// endpoint exposed by the Electron main process. The port is resolved from
/// configuration (<c>Mozgoslav:AudioRecorder:ElectronBridgePort</c>, typically
/// populated from the <c>Mozgoslav__AudioRecorder__ElectronBridgePort</c>
/// environment variable set by <c>frontend/electron/utils/backendLauncher.ts</c>
/// at backend spawn time).
/// <para>
/// On invocation without a running Electron host (dev backend started via
/// <c>dotnet run</c>), <see cref="IsSupported"/> returns <c>false</c> and
/// <see cref="StartAsync"/> throws.
/// </para>
/// </summary>
public sealed class AVFoundationAudioRecorder : IAudioRecorder
{
    private readonly HttpClient _http;
    private readonly ILogger<AVFoundationAudioRecorder> _logger;
    private readonly int? _electronBridgePort;
    private readonly Lock _gate = new();
    private string? _activeSessionId;
    private DateTime _startedAtUtc;

    public AVFoundationAudioRecorder(
        HttpClient http,
        ILogger<AVFoundationAudioRecorder> logger,
        IOptions<AudioRecorderOptions> options)
        : this(http, logger, options.Value.ElectronBridgePort)
    {
    }

    /// <summary>
    /// Test-friendly constructor with explicit port. Production code wires
    /// through <see cref="IOptions{AudioRecorderOptions}"/>.
    /// </summary>
    public AVFoundationAudioRecorder(
        HttpClient http,
        ILogger<AVFoundationAudioRecorder> logger,
        int? electronBridgePort)
    {
        _http = http;
        _logger = logger;
        _electronBridgePort = electronBridgePort;
    }

    public bool IsSupported => OperatingSystem.IsMacOS() && _electronBridgePort is > 0;

    public bool IsRecording
    {
        get
        {
            lock (_gate)
            {
                return _activeSessionId is not null;
            }
        }
    }

    public TimeSpan CurrentDuration
    {
        get
        {
            lock (_gate)
            {
                return _activeSessionId is null ? TimeSpan.Zero : DateTime.UtcNow - _startedAtUtc;
            }
        }
    }

    public async Task StartAsync(string outputPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(outputPath);
        EnsureSupported();

        lock (_gate)
        {
            if (_activeSessionId is not null)
            {
                throw new InvalidOperationException(
                    "Recording session is already active. Stop the current session before starting a new one.");
            }
        }

        using var response = await _http.PostAsJsonAsync(
            ResolveBridgeUri("/_internal/record/start"),
            new { outputPath },
            ct);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<StartResponse>(ct)
            ?? throw new InvalidOperationException("Electron bridge returned an empty start payload.");

        lock (_gate)
        {
            _activeSessionId = body.SessionId;
            _startedAtUtc = DateTime.UtcNow;
        }
        _logger.LogInformation("AVFoundation recorder started session {SessionId} → {Path}", body.SessionId, outputPath);
    }

    public async Task<string> StopAsync(CancellationToken ct)
    {
        string sessionId;
        lock (_gate)
        {
            sessionId = _activeSessionId
                ?? throw new InvalidOperationException("No active recording session to stop.");
        }

        try
        {
            using var response = await _http.PostAsJsonAsync(
                ResolveBridgeUri($"/_internal/record/stop/{sessionId}"),
                new { },
                ct);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<StopResponse>(ct)
                ?? throw new InvalidOperationException("Electron bridge returned an empty stop payload.");
            _logger.LogInformation(
                "AVFoundation recorder stopped session {SessionId} → {Path} ({DurationMs}ms)",
                sessionId, body.Path, body.DurationMs);
            return body.Path;
        }
        finally
        {
            lock (_gate)
            {
                _activeSessionId = null;
            }
        }
    }

    private void EnsureSupported()
    {
        if (!OperatingSystem.IsMacOS())
        {
            throw new PlatformNotSupportedException(
                "AVFoundation recorder is macOS-only. Running on a non-macOS host.");
        }
        if (_electronBridgePort is null or <= 0)
        {
            throw new InvalidOperationException(
                "Electron bridge port not configured. Set 'Mozgoslav:AudioRecorder:ElectronBridgePort' " +
                "in appsettings (env override: Mozgoslav__AudioRecorder__ElectronBridgePort). " +
                "Launch the backend via the Electron host, not stand-alone.");
        }
    }

    private Uri ResolveBridgeUri(string path) =>
        new($"http://127.0.0.1:{_electronBridgePort}{path}");

    private sealed record StartResponse(
        [property: JsonPropertyName("sessionId")] string SessionId);

    private sealed record StopResponse(
        [property: JsonPropertyName("path")] string Path,
        [property: JsonPropertyName("durationMs")] int DurationMs);
}
