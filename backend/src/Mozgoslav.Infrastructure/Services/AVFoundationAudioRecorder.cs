using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Configuration;

namespace Mozgoslav.Infrastructure.Services;

public sealed class AVFoundationAudioRecorder : IAudioRecorder
{
    private readonly HttpClient _http;
    private readonly ILogger<AVFoundationAudioRecorder> _logger;
    private readonly int? _electronBridgePort;
    private readonly Lock _gate = new();
    private string? _activeSessionId;
    private DateTime _startedAtUtc;

    [ActivatorUtilitiesConstructor]
    public AVFoundationAudioRecorder(
        HttpClient http,
        ILogger<AVFoundationAudioRecorder> logger,
        IOptions<AudioRecorderOptions> options)
        : this(http, logger, options.Value.ElectronBridgePort)
    {
    }

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

        var bridgeUri = ResolveBridgeUri("/_internal/record/start");
        _logger.LogInformation(
            "D1 handoff: POST {BridgeUri} outputPath={OutputPath}",
            bridgeUri, outputPath);

        using var response = await _http.PostAsJsonAsync(
            bridgeUri,
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
        _logger.LogInformation(
            "D1 handoff: recorder started session {SessionId} → {Path}",
            body.SessionId, outputPath);
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
            var bridgeUri = ResolveBridgeUri($"/_internal/record/stop/{sessionId}");
            _logger.LogInformation("D1 handoff: POST {BridgeUri}", bridgeUri);
            using var response = await _http.PostAsJsonAsync(
                bridgeUri,
                new { },
                ct);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<StopResponse>(ct)
                ?? throw new InvalidOperationException("Electron bridge returned an empty stop payload.");
            long fileSize = -1;
            try
            {
                if (File.Exists(body.Path))
                {
                    fileSize = new FileInfo(body.Path).Length;
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning(ex,
                    "D1 handoff: could not stat {Path} after stop", body.Path);
            }
            _logger.LogInformation(
                "D1 handoff: recorder stopped session {SessionId} → {Path} ({DurationMs}ms, size={Size}b)",
                sessionId, body.Path, body.DurationMs, fileSize);
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
