using System.ComponentModel;
using System.Diagnostics;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="IAudioPcmDecoder"/> backed by <c>ffmpeg</c>. Pipes the encoded
/// payload through stdin, reads float32 LE PCM from stdout. Used by the
/// Dashboard record-button path (BC-004) which posts Opus-in-WebM chunks
/// from the browser's <c>MediaRecorder</c> to
/// <c>/api/dictation/{id}/push</c>.
/// </summary>
public sealed class FfmpegPcmDecoder : IAudioPcmDecoder
{
    private const string FfmpegExecutable = "ffmpeg";
    private const int DefaultSampleRate = 16_000;

    private readonly ILogger<FfmpegPcmDecoder> _logger;

    public FfmpegPcmDecoder(ILogger<FfmpegPcmDecoder> logger)
    {
        _logger = logger;
    }

    public int TargetSampleRate => DefaultSampleRate;

    public async Task<float[]> DecodeToPcmAsync(byte[] encodedPayload, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(encodedPayload);
        if (encodedPayload.Length == 0)
        {
            return [];
        }

        var psi = new ProcessStartInfo
        {
            FileName = FfmpegExecutable,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        // Read from stdin, emit float32 LE mono 16 kHz raw PCM to stdout.
        psi.ArgumentList.Add("-hide_banner");
        psi.ArgumentList.Add("-loglevel");
        psi.ArgumentList.Add("error");
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add("pipe:0");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add("f32le");
        psi.ArgumentList.Add("-ac");
        psi.ArgumentList.Add("1");
        psi.ArgumentList.Add("-ar");
        psi.ArgumentList.Add(TargetSampleRate.ToString(System.Globalization.CultureInfo.InvariantCulture));
        psi.ArgumentList.Add("pipe:1");

        using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        try
        {
            process.Start();
        }
        catch (Win32Exception ex)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS " +
                "(or 'apt-get install ffmpeg' on Linux).", ex);
        }

        var pcmBytes = await PumpAsync(process, encodedPayload, ct).ConfigureAwait(false);
        if (pcmBytes.Length == 0)
        {
            return [];
        }
        if (pcmBytes.Length % sizeof(float) != 0)
        {
            throw new InvalidOperationException(
                $"ffmpeg emitted an odd PCM payload ({pcmBytes.Length} bytes) — expected multiple of 4.");
        }

        var samples = new float[pcmBytes.Length / sizeof(float)];
        Buffer.BlockCopy(pcmBytes, 0, samples, 0, pcmBytes.Length);
        return samples;
    }

    private async Task<byte[]> PumpAsync(Process process, byte[] encodedPayload, CancellationToken ct)
    {
        // Drain stdout into a byte accumulator and stderr into a string in parallel
        // with the stdin pump. Avoids MemoryStream here so the IDisposable analyzers
        // don't flag the CopyToAsync task as a lifetime hazard.
        var stdout = new List<byte>();
        var stdoutTask = ReadAllBytesAsync(process.StandardOutput.BaseStream, stdout, ct);
        var stderrTask = process.StandardError.ReadToEndAsync(ct);

        try
        {
            await process.StandardInput.BaseStream.WriteAsync(encodedPayload, ct).ConfigureAwait(false);
        }
        finally
        {
            process.StandardInput.BaseStream.Close();
        }

        await stdoutTask.ConfigureAwait(false);
        var stderr = await stderrTask.ConfigureAwait(false);
        await process.WaitForExitAsync(ct).ConfigureAwait(false);

        if (process.ExitCode != 0)
        {
            _logger.LogWarning(
                "ffmpeg decode failed with exit {ExitCode}: {Stderr}", process.ExitCode, stderr);
            throw new InvalidOperationException(
                $"ffmpeg decode exited with code {process.ExitCode}: {stderr}");
        }

        return [.. stdout];
    }

    private static async Task ReadAllBytesAsync(Stream source, List<byte> sink, CancellationToken ct)
    {
        var buf = new byte[8192];
        while (true)
        {
            var read = await source.ReadAsync(buf, ct).ConfigureAwait(false);
            if (read <= 0)
            {
                return;
            }
            sink.AddRange(buf.AsSpan(0, read));
        }
    }
}
