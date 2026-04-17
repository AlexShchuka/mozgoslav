using System.Globalization;
using System.IO.Pipelines;
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

        var stdoutPipe = new Pipe();
        var stderr = new StringBuilder();

        // Pipe.Writer.AsStream returns a wrapper whose lifetime is the Pipe's;
        // the PipeTarget.ToStream wrapper flushes + closes on completion.
        // IDISP004 cannot see through the indirection.
#pragma warning disable IDISP004, IDISP001
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
            .WithStandardOutputPipe(PipeTarget.ToStream(stdoutPipe.Writer.AsStream(leaveOpen: false)))
            .WithStandardErrorPipe(PipeTarget.ToStringBuilder(stderr))
            .WithValidation(CommandResultValidation.None);
#pragma warning restore IDISP004, IDISP001

        byte[] pcmBytes;
        try
        {
            var executionTask = execution.ExecuteAsync(ct);
            pcmBytes = await DrainAsync(stdoutPipe.Reader, ct).ConfigureAwait(false);
            // CliWrap's CommandResult is a record — no IDisposable. The
            // analyzer misidentifies it; suppress.
#pragma warning disable IDISP001
            var result = await executionTask.ConfigureAwait(false);
#pragma warning restore IDISP001

            if (result.ExitCode != 0)
            {
                _logger.LogWarning(
                    "ffmpeg decode failed with exit {ExitCode}: {Stderr}", result.ExitCode, stderr);
                throw new InvalidOperationException(
                    $"ffmpeg decode exited with code {result.ExitCode}: {stderr}");
            }
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

    private static async Task<byte[]> DrainAsync(PipeReader reader, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        while (true)
        {
            var result = await reader.ReadAsync(ct).ConfigureAwait(false);
            foreach (var segment in result.Buffer)
            {
                buffer.Write(segment.Span);
            }
            reader.AdvanceTo(result.Buffer.End);
            if (result.IsCompleted)
            {
                break;
            }
        }
        await reader.CompleteAsync().ConfigureAwait(false);
        return buffer.ToArray();
    }
}
