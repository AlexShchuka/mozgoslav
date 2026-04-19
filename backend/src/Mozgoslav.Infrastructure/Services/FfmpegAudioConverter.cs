using System.Text;

using CliWrap;
using CliWrap.Exceptions;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Wraps the <c>ffmpeg</c> binary to convert arbitrary audio files into the format
/// Whisper expects: 16 kHz, mono, PCM WAV. Output is written to the app temp dir
/// and reused by the transcription step before being cleaned up.
/// <para>
/// ADR-011 step 8 — built on <see cref="Cli"/> (CliWrap) so the process lifetime,
/// stderr capture, and exit-code handling are provided by the library instead of
/// hand-rolled <c>ProcessStartInfo</c> plumbing.
/// </para>
/// </summary>
public sealed class FfmpegAudioConverter : IAudioConverter
{
    private const string FfmpegExecutable = "ffmpeg";

    private readonly ILogger<FfmpegAudioConverter> _logger;

    public FfmpegAudioConverter(ILogger<FfmpegAudioConverter> logger)
    {
        _logger = logger;
    }

    public async Task<string> ConvertToWavAsync(string inputPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(inputPath);
        if (!File.Exists(inputPath))
        {
            throw new FileNotFoundException("Audio file not found", inputPath);
        }

        Directory.CreateDirectory(AppPaths.Temp);
        var outputPath = Path.Combine(AppPaths.Temp, $"{Guid.NewGuid():N}.wav");

        var stderr = new StringBuilder();

        try
        {
#pragma warning disable IDISP001
            var result = await Cli.Wrap(FfmpegExecutable)
                .WithArguments(args => args
                    .Add("-y")
                    .Add("-i").Add(inputPath)
                    .Add("-ar").Add("16000")
                    .Add("-ac").Add("1")
                    .Add("-f").Add("wav")
                    .Add(outputPath))
                .WithStandardErrorPipe(PipeTarget.ToStringBuilder(stderr))
                .WithValidation(CommandResultValidation.None)
                .ExecuteAsync(ct)
                .ConfigureAwait(false);
#pragma warning restore IDISP001

            if (result.ExitCode != 0)
            {
                _logger.LogError("ffmpeg failed: {Stderr}", stderr.ToString());
                throw new InvalidOperationException($"ffmpeg exited with code {result.ExitCode}");
            }

            return outputPath;
        }
        catch (CommandExecutionException ex) when (ex.InnerException is System.ComponentModel.Win32Exception)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS.", ex);
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS.", ex);
        }
    }
}
