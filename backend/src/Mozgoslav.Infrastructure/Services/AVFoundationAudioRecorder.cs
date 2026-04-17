using System.Net.Http.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// macOS native audio recorder. Delegates capture to the Swift helper
/// (<c>helpers/MozgoslavDictationHelper</c>) via an internal loopback HTTP
/// endpoint exposed by the Electron main process. The port is communicated
/// through the <c>MOZGOSLAV_ELECTRON_INTERNAL_PORT</c> environment variable at
/// backend spawn time (see <c>frontend/electron/utils/backendLauncher.ts</c>).
/// <para>
/// On invocation without a running Electron host (dev backend started via
/// <c>dotnet run</c>), <see cref="IsSupported"/> returns <c>false</c> and
/// <see cref="StartAsync"/> throws.
/// </para>
/// </summary>
public sealed class AVFoundationAudioRecorder : IAudioRecorder
{
    private const string EnvPortKey = "MOZGOSLAV_ELECTRON_INTERNAL_PORT";

    private readonly HttpClient _http;
    private readonly ILogger<AVFoundationAudioRecorder> _logger;
    private readonly Lock _gate = new();
    private string? _activeSessionId;
    private DateTime _startedAtUtc;

    public AVFoundationAudioRecorder(HttpClient http, ILogger<AVFoundationAudioRecorder> logger)
    {
        _http = http;
        _logger = logger;
    }

    public bool IsSupported
    {
        get
        {
            if (!OperatingSystem.IsMacOS())
            {
                return false;
            }
            return !string.IsNullOrEmpty(Environment.GetEnvironmentVariable(EnvPortKey));
        }
    }

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
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(EnvPortKey)))
        {
            throw new InvalidOperationException(
                $"Electron bridge port missing ({EnvPortKey} env var unset). " +
                "Launch the backend via the Electron host, not stand-alone.");
        }
    }

    private static Uri ResolveBridgeUri(string path)
    {
        var port = Environment.GetEnvironmentVariable(EnvPortKey)
            ?? throw new InvalidOperationException($"{EnvPortKey} env var is not set.");
        return new Uri($"http://127.0.0.1:{port}{path}");
    }

    private sealed record StartResponse(
        [property: JsonPropertyName("sessionId")] string SessionId);

    private sealed record StopResponse(
        [property: JsonPropertyName("path")] string Path,
        [property: JsonPropertyName("durationMs")] int DurationMs);
}
