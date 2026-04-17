using System.Diagnostics;
using System.Runtime.InteropServices;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Spawns <c>ffmpeg -f avfoundation -i ":0" -ac 1 -ar 48000 -y &lt;path&gt;</c> for
/// real mic capture on macOS Apple Silicon. This is the B11 default until a
/// native Swift AVAudioEngine helper ships — ffmpeg-based capture is already
/// a hard dependency of Mozgoslav (see README "Требования") so no new bundled
/// binary is introduced.
/// <para>
/// <see cref="StopAsync"/> sends <c>q</c> on stdin (ffmpeg's graceful-shutdown
/// token), flushes the container, and returns the output path once the process
/// exits. Non-zero exit codes throw.
/// </para>
/// </summary>
public sealed class FfmpegAudioRecorder : IAudioRecorder
{
    private readonly ILogger<FfmpegAudioRecorder> _logger;
    private Process? _process;
    private string? _outputPath;
    private DateTime _startedAt;

    public FfmpegAudioRecorder(ILogger<FfmpegAudioRecorder> logger)
    {
        _logger = logger;
    }

    public bool IsSupported => RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
    public bool IsRecording => _process is { HasExited: false };
    public TimeSpan CurrentDuration => IsRecording ? DateTime.UtcNow - _startedAt : TimeSpan.Zero;

    public Task StartAsync(string outputPath, CancellationToken ct)
    {
        if (!IsSupported)
        {
            throw new PlatformNotSupportedException(
                "FfmpegAudioRecorder requires macOS. Non-macOS platforms fall back to NoopAudioRecorder.");
        }
        if (IsRecording)
        {
            throw new InvalidOperationException("Recording already in progress.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(outputPath);
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);

        var info = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            Arguments = $"-hide_banner -loglevel warning -f avfoundation -i \":0\" -ac 1 -ar 48000 -y \"{outputPath}\"",
            RedirectStandardInput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        var proc = Process.Start(info)
            ?? throw new InvalidOperationException("Failed to start ffmpeg — is it on PATH? (brew install ffmpeg).");

        _process = proc;
        _outputPath = outputPath;
        _startedAt = DateTime.UtcNow;
        _logger.LogInformation("ffmpeg recording started: pid={Pid}, output={Path}", proc.Id, outputPath);
        return Task.CompletedTask;
    }

    public async Task<string> StopAsync(CancellationToken ct)
    {
        var proc = _process ?? throw new InvalidOperationException("Recording was not started.");
        var output = _outputPath!;

        try
        {
            await proc.StandardInput.WriteAsync("q".AsMemory(), ct);
            await proc.StandardInput.FlushAsync(ct);
            proc.StandardInput.Close();
        }
        catch (ObjectDisposedException)
        {
            // ffmpeg already exited
        }

        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        linkedCts.CancelAfter(TimeSpan.FromSeconds(5));
        await proc.WaitForExitAsync(linkedCts.Token).ConfigureAwait(false);
        if (proc.ExitCode != 0)
        {
            var stderr = await proc.StandardError.ReadToEndAsync(ct);
            throw new InvalidOperationException($"ffmpeg exited with code {proc.ExitCode}: {stderr}");
        }

        _process = null;
        _outputPath = null;
        _logger.LogInformation("ffmpeg recording stopped: {Path}", output);
        return output;
    }
}
