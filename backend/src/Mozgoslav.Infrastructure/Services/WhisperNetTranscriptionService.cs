using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;
using Whisper.net;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Native Whisper.net-based transcription (no subprocess). Uses CoreML acceleration
/// when the runtime package finds the <c>.mlmodelc</c> companion next to the ggml
/// model. Parameters are those verified by the prototype pipeline (BACKEND-SPEC §9).
/// </summary>
public sealed class WhisperNetTranscriptionService : ITranscriptionService
{
    private const int BeamSize = 5;
    private const string DefaultPrompt = "Мысли вслух, встречи, диалоги, рассуждения.";

    private readonly IAppSettings _settings;
    private readonly ILogger<WhisperNetTranscriptionService> _logger;

    public WhisperNetTranscriptionService(
        IAppSettings settings,
        ILogger<WhisperNetTranscriptionService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<IReadOnlyList<TranscriptSegment>> TranscribeAsync(
        string audioPath,
        string language,
        string? initialPrompt,
        IProgress<int>? progress,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(audioPath);
        if (!File.Exists(audioPath))
        {
            throw new FileNotFoundException("Audio file not found", audioPath);
        }

        var modelPath = _settings.WhisperModelPath;
        if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
        {
            throw new InvalidOperationException(
                $"Whisper model is not configured or missing on disk: '{modelPath}'. " +
                "Download it via the Models page in Settings.");
        }

        _logger.LogInformation("Transcribing {AudioPath} with model {Model}", audioPath, Path.GetFileName(modelPath));

        using var whisperFactory = WhisperFactory.FromPath(modelPath);
        var builder = whisperFactory.CreateBuilder()
            .WithLanguage(language)
            .WithPrompt(string.IsNullOrWhiteSpace(initialPrompt) ? DefaultPrompt : initialPrompt);

        var beamStrategy = builder.WithBeamSearchSamplingStrategy();
        if (beamStrategy is BeamSearchSamplingStrategyBuilder beamBuilder)
        {
            beamBuilder.WithBeamSize(BeamSize);
        }

        using var processor = builder.Build();

        var segments = new List<TranscriptSegment>();
        await using var audioStream = File.OpenRead(audioPath);

        await foreach (var segment in processor.ProcessAsync(audioStream).WithCancellation(ct))
        {
            segments.Add(new TranscriptSegment(segment.Start, segment.End, segment.Text.Trim()));
            progress?.Report(Math.Min(99, segments.Count)); // best-effort, final 100 set by caller
        }

        _logger.LogInformation("Transcription complete: {Count} segments", segments.Count);
        return segments;
    }
}
