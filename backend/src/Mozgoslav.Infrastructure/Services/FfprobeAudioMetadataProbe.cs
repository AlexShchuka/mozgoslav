using System.Globalization;
using System.Text;

using CliWrap;
using CliWrap.Exceptions;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="IAudioMetadataProbe"/> backed by <c>ffprobe</c>. Runs
/// <c>ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1</c>
/// against the source file and parses the float64 seconds from stdout.
/// Task #19 — called at import time so <c>Recording.Duration</c> reflects
/// the real media length before the transcription pipeline runs.
/// </summary>
public sealed class FfprobeAudioMetadataProbe : IAudioMetadataProbe
{
    private const string FfprobeExecutable = "ffprobe";

    private readonly ILogger<FfprobeAudioMetadataProbe> _logger;

    public FfprobeAudioMetadataProbe(ILogger<FfprobeAudioMetadataProbe> logger)
    {
        _logger = logger;
    }

    public async Task<TimeSpan> GetDurationAsync(string filePath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        if (!File.Exists(filePath))
        {
            _logger.LogWarning("ffprobe: file not found at {Path}; returning TimeSpan.Zero", filePath);
            return TimeSpan.Zero;
        }

        var stdout = new StringBuilder();
        var stderr = new StringBuilder();

#pragma warning disable IDISP001
        var execution = Cli.Wrap(FfprobeExecutable)
            .WithArguments(args => args
                .Add("-v").Add("error")
                .Add("-show_entries").Add("format=duration")
                .Add("-of").Add("default=nw=1:nk=1")
                .Add(filePath))
            .WithStandardOutputPipe(PipeTarget.ToStringBuilder(stdout))
            .WithStandardErrorPipe(PipeTarget.ToStringBuilder(stderr))
            .WithValidation(CommandResultValidation.None);
#pragma warning restore IDISP001

        try
        {
#pragma warning disable IDISP001
            var result = await execution.ExecuteAsync(ct).ConfigureAwait(false);
#pragma warning restore IDISP001
            if (result.ExitCode != 0)
            {
                _logger.LogWarning(
                    "ffprobe exited {ExitCode} for {Path}: {Stderr}",
                    result.ExitCode, filePath, stderr);
                return TimeSpan.Zero;
            }
        }
        catch (CommandExecutionException ex) when (ex.InnerException is System.ComponentModel.Win32Exception)
        {
            _logger.LogWarning(ex, "ffprobe not on PATH — Recording.Duration will be left as TimeSpan.Zero");
            return TimeSpan.Zero;
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            _logger.LogWarning(ex, "ffprobe not on PATH — Recording.Duration will be left as TimeSpan.Zero");
            return TimeSpan.Zero;
        }

        var raw = stdout.ToString().Trim();
        if (!double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds) || seconds <= 0)
        {
            _logger.LogWarning("ffprobe returned unparseable duration for {Path}: '{Raw}'", filePath, raw);
            return TimeSpan.Zero;
        }

        return TimeSpan.FromSeconds(seconds);
    }
}
