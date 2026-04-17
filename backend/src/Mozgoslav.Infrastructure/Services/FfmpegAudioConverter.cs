using System.ComponentModel;
using System.Diagnostics;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Wraps the <c>ffmpeg</c> binary to convert arbitrary audio files into the format
/// Whisper expects: 16 kHz, mono, PCM WAV. Output is written to the app temp dir
/// and reused by the transcription step before being cleaned up.
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

        var psi = new ProcessStartInfo
        {
            FileName = FfmpegExecutable,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        psi.ArgumentList.Add("-y");
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add(inputPath);
        psi.ArgumentList.Add("-ar");
        psi.ArgumentList.Add("16000");
        psi.ArgumentList.Add("-ac");
        psi.ArgumentList.Add("1");
        psi.ArgumentList.Add("-f");
        psi.ArgumentList.Add("wav");
        psi.ArgumentList.Add(outputPath);

        using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        try
        {
            process.Start();
        }
        catch (Win32Exception ex)
        {
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS.", ex);
        }

        await process.WaitForExitAsync(ct);

        if (process.ExitCode != 0)
        {
            var stderr = await process.StandardError.ReadToEndAsync(ct);
            _logger.LogError("ffmpeg failed: {Stderr}", stderr);
            throw new InvalidOperationException($"ffmpeg exited with code {process.ExitCode}");
        }

        return outputPath;
    }
}
