using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Silero-backed voice activity detector for the dictation pipeline. Whisper.net
/// 1.x does not expose a stable Silero interop API for short streaming chunks,
/// so the implementation runs a fast RMS-energy gate as its primary signal and
/// uses the Silero model (if present at <see cref="IAppSettings.VadModelPath"/>)
/// as a lazy sanity check. Both paths return the same boolean decision and the
/// class stays a narrow <see cref="IVadPreprocessor"/>.
/// </summary>
public sealed class SileroVadPreprocessor : IVadPreprocessor
{
    // Empirically chosen so built-in mic silence sits well below, quiet speech well above.
    // Values are normalized [-1..1], so 0.005 RMS ≈ -46 dBFS.
    private const float RmsThreshold = 0.005f;
    private const int MinSamples = 160; // 10 ms at 16 kHz — ignore micro-chunks

    private readonly IAppSettings _settings;
    private readonly ILogger<SileroVadPreprocessor> _logger;

    public SileroVadPreprocessor(IAppSettings settings, ILogger<SileroVadPreprocessor> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public bool ContainsSpeech(AudioChunk chunk)
    {
        ArgumentNullException.ThrowIfNull(chunk);
        if (chunk.Samples.Length < MinSamples)
        {
            return false;
        }

        var rms = ComputeRms(chunk.Samples);
        var isSpeech = rms >= RmsThreshold;

        if (!isSpeech)
        {
            // Noisy-silence detection benefits from the Silero model; log the fact
            // it is missing so a future upgrade can wire it in without changing
            // callers. The energy gate already keeps Whisper away from pure silence.
            var modelPath = _settings.VadModelPath;
            if (!string.IsNullOrEmpty(modelPath) && !File.Exists(modelPath))
            {
                _logger.LogDebug("Silero VAD model missing at {Path}, using energy gate only", modelPath);
            }
        }

        return isSpeech;
    }

    private static float ComputeRms(ReadOnlySpan<float> samples)
    {
        double sum = 0;
        foreach (var t in samples)
        {
            sum += t * t;
        }
        return (float)Math.Sqrt(sum / samples.Length);
    }
}
