using System.Globalization;
using System.Text;

using CliWrap;
using CliWrap.Exceptions;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="IAudioPcmDecoder"/> backed by <c>ffmpeg</c>. Pipes the encoded
/// payload through stdin, reads float32 LE PCM from stdout. Used by the
/// Dashboard record-button path (BC-004) which posts Opus-in-WebM chunks
/// from the browser's <c>MediaRecorder</c> to
/// <c>/api/dictation/{id}/push</c>.
/// <para>
/// ADR-011 step 8 — built on <see cref="Cli"/> (CliWrap) so stdin/stdout/stderr
/// piping, exit code handling, and cancellation come from the library instead
/// of hand-rolled <c>ProcessStartInfo</c> / <c>Process.Start</c>.
/// </para>
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

        using var stdoutBuffer = new MemoryStream();
        var stderr = new StringBuilder();

        // IDISP001 — CliWrap.Command is a builder struct whose lifetime ends
        // at ExecuteAsync; IDisposableAnalyzers cannot see that.
#pragma warning disable IDISP001
        var execution = Cli.Wrap(FfmpegExecutable)
            .WithArguments(args => args
                .Add("-hide_banner")
                .Add("-loglevel").Add("error")
                .Add("-i").Add("pipe:0")
                .Add("-f").Add("f32le")
                .Add("-ac").Add("1")
                .Add("-ar").Add(TargetSampleRate.ToString(CultureInfo.InvariantCulture))
                .Add("pipe:1"))
            .WithStandardInputPipe(PipeSource.FromBytes(encodedPayload))
            .WithStandardOutputPipe(PipeTarget.ToStream(stdoutBuffer))
            .WithStandardErrorPipe(PipeTarget.ToStringBuilder(stderr))
            .WithValidation(CommandResultValidation.None);
#pragma warning restore IDISP001

        CommandResult result;
        try
        {
            // CommandResult is a record; IDISP001 false-positive.
#pragma warning disable IDISP001
            result = await execution.ExecuteAsync(ct).ConfigureAwait(false);
#pragma warning restore IDISP001
        }
        catch (CommandExecutionException ex) when (ex.InnerException is System.ComponentModel.Win32Exception)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS " +
                "(or 'apt-get install ffmpeg' on Linux).", ex);
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS " +
                "(or 'apt-get install ffmpeg' on Linux).", ex);
        }

        if (result.ExitCode != 0)
        {
            _logger.LogWarning(
                "ffmpeg decode failed with exit {ExitCode}: {Stderr}", result.ExitCode, stderr);
            throw new InvalidOperationException(
                $"ffmpeg decode exited with code {result.ExitCode}: {stderr}");
        }

        var pcmBytes = stdoutBuffer.ToArray();
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
}
