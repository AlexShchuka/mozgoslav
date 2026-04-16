using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;
using Whisper.net;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Native Whisper.net-based transcription (no subprocess). Uses CoreML acceleration
/// when the runtime package finds the <c>.mlmodelc</c> companion next to the ggml
/// model. Parameters are those verified by the prototype pipeline (BACKEND-SPEC §9).
/// Also implements <see cref="IStreamingTranscriptionService"/> for the push-to-talk
/// dictation pipeline: samples arrive in short 16 kHz PCM chunks and the service
/// emits partial transcripts roughly every <see cref="StreamWindowMs"/> milliseconds
/// of accumulated speech.
/// </summary>
public sealed class WhisperNetTranscriptionService : ITranscriptionService, IStreamingTranscriptionService
{
    private const int BeamSize = 5;
    private const string DefaultPrompt = "Мысли вслух, встречи, диалоги, рассуждения.";
    private const int StreamSampleRate = 16_000;
    private const int StreamWindowMs = 500;
    private const int StreamMaxBufferSeconds = 120;

    private readonly IAppSettings _settings;
    private readonly IVadPreprocessor _vad;
    private readonly ILogger<WhisperNetTranscriptionService> _logger;

    public WhisperNetTranscriptionService(
        IAppSettings settings,
        IVadPreprocessor vad,
        ILogger<WhisperNetTranscriptionService> logger)
    {
        _settings = settings;
        _vad = vad;
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

        var modelPath = EnsureModelPath();
        _logger.LogInformation("Transcribing {AudioPath} with model {Model}", audioPath, Path.GetFileName(modelPath));

        using var whisperFactory = WhisperFactory.FromPath(modelPath);
        using var processor = BuildProcessor(whisperFactory, language, initialPrompt);

        var segments = new List<TranscriptSegment>();
        await using var audioStream = File.OpenRead(audioPath);

        await foreach (var segment in processor.ProcessAsync(audioStream, ct).WithCancellation(ct))
        {
            segments.Add(new TranscriptSegment(segment.Start, segment.End, segment.Text.Trim()));
            progress?.Report(Math.Min(99, segments.Count));
        }

        _logger.LogInformation("Transcription complete: {Count} segments", segments.Count);
        return segments;
    }

    public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
        IAsyncEnumerable<AudioChunk> chunks,
        string language,
        string? initialPrompt,
        [EnumeratorCancellation] CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunks);

        var modelPath = EnsureModelPath();
        _logger.LogInformation("Starting streaming transcription with model {Model}", Path.GetFileName(modelPath));

        using var whisperFactory = WhisperFactory.FromPath(modelPath);

        var buffer = new List<float>();
        var samplesSinceLastEmit = 0;
        var windowSamples = StreamSampleRate * StreamWindowMs / 1000;
        var maxBufferSamples = StreamSampleRate * StreamMaxBufferSeconds;

        await foreach (var chunk in chunks.WithCancellation(ct))
        {
            if (chunk.SampleRate != StreamSampleRate)
            {
                throw new InvalidOperationException(
                    $"Streaming expects {StreamSampleRate} Hz mono samples, got {chunk.SampleRate} Hz");
            }

            if (!_vad.ContainsSpeech(chunk))
            {
                continue;
            }

            buffer.AddRange(chunk.Samples);
            samplesSinceLastEmit += chunk.Samples.Length;

            // Cap runaway sessions — after two minutes we keep the tail only.
            if (buffer.Count > maxBufferSamples)
            {
                var overflow = buffer.Count - maxBufferSamples;
                buffer.RemoveRange(0, overflow);
            }

            if (samplesSinceLastEmit >= windowSamples)
            {
                samplesSinceLastEmit = 0;
                var snapshot = buffer.ToArray();
                var text = await TranscribeBufferAsync(whisperFactory, snapshot, language, initialPrompt, ct);
                if (!string.IsNullOrWhiteSpace(text))
                {
                    yield return new PartialTranscript(
                        Text: text,
                        Timestamp: TimeSpan.FromSeconds((double)buffer.Count / StreamSampleRate));
                }
            }
        }

        // Final flush when the upstream completes cleanly.
        if (buffer.Count > 0)
        {
            var tail = buffer.ToArray();
            var text = await TranscribeBufferAsync(whisperFactory, tail, language, initialPrompt, ct);
            if (!string.IsNullOrWhiteSpace(text))
            {
                yield return new PartialTranscript(
                    Text: text,
                    Timestamp: TimeSpan.FromSeconds((double)buffer.Count / StreamSampleRate));
            }
        }
    }

    private async Task<string> TranscribeBufferAsync(
        WhisperFactory whisperFactory,
        float[] samples,
        string language,
        string? initialPrompt,
        CancellationToken ct)
    {
        using var processor = BuildProcessor(whisperFactory, language, initialPrompt);

        var parts = new List<string>();
        await foreach (var segment in processor.ProcessAsync(samples, ct).WithCancellation(ct))
        {
            var text = segment.Text?.Trim();
            if (!string.IsNullOrEmpty(text))
            {
                parts.Add(text);
            }
        }

        return string.Join(" ", parts).Trim();
    }

    private string EnsureModelPath()
    {
        var modelPath = _settings.WhisperModelPath;
        if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
        {
            throw new InvalidOperationException(
                $"Whisper model is not configured or missing on disk: '{modelPath}'. " +
                "Download it via the Models page in Settings.");
        }
        return modelPath;
    }

    private static WhisperProcessor BuildProcessor(WhisperFactory factory, string language, string? initialPrompt)
    {
        var builder = factory.CreateBuilder()
            .WithLanguage(language)
            .WithPrompt(string.IsNullOrWhiteSpace(initialPrompt) ? DefaultPrompt : initialPrompt)
            .WithTemperature(0);

        var beamStrategy = builder.WithBeamSearchSamplingStrategy();
        if (beamStrategy is BeamSearchSamplingStrategyBuilder beamBuilder)
        {
            beamBuilder.WithBeamSize(BeamSize);
        }

        return builder.Build();
    }
}
