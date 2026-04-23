using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Caching.Memory;
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
/// <para>
/// ADR-004 R4 / ADR-011 step 2 — the <see cref="WhisperFactory"/> (which holds the
/// loaded model in RAM — several hundred MB for <c>large-v3</c>) is cached via
/// <see cref="IMemoryCache"/> with a sliding expiration matching
/// <see cref="IAppSettings.DictationModelUnloadMinutes"/>. The cache entry's
/// <see cref="MemoryCacheEntryOptions.PostEvictionCallbacks"/> dispose the factory
/// when the entry is evicted; the next call re-loads it with a ~1-2 s first-call
/// latency penalty. During long streams the service touches the cache on every
/// windowed emit so the sliding window never elapses while transcription is
/// actively running.
/// </para>
/// </summary>
public sealed class WhisperNetTranscriptionService
    : ITranscriptionService, IStreamingTranscriptionService
{
    internal const string CacheKey = "whisper.factory";
    private const int BeamSize = 5;
    private const int StreamBeamSize = 1;
    private const string DefaultPrompt =
        "Мысли вслух, встречи, диалоги, рассуждения. Запятые, точки, тире, вопросительные и восклицательные знаки: так, ведь, вот — именно.";
    private const int StreamSampleRate = 16_000;
    private const int StreamWindowMs = 300;
    private const int StreamMaxBufferSeconds = 15;
    private static readonly TimeSpan MinSlidingExpiration = TimeSpan.FromMinutes(1);

    private readonly IVadPreprocessor _vad;
    private readonly IMemoryCache _cache;
    private readonly IAppSettings _settings;
    private readonly ILogger<WhisperNetTranscriptionService> _logger;

    public WhisperNetTranscriptionService(
        IVadPreprocessor vad,
        IMemoryCache cache,
        IAppSettings settings,
        ILogger<WhisperNetTranscriptionService> logger)
    {
        _vad = vad;
        _cache = cache;
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

        _logger.LogInformation("Transcribing {AudioPath}", audioPath);

#pragma warning disable IDISP001
        var whisperFactory = GetOrCreateFactory();
#pragma warning restore IDISP001
        await using var processor = BuildProcessor(whisperFactory, language, initialPrompt);

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

        _logger.LogInformation("Starting streaming transcription");
_logger.LogDebug("Transcription parameters: language={Lang}, prompt={Prompt}", language, initialPrompt ?? "<none>");

#pragma warning disable IDISP001
        var whisperFactory = GetOrCreateFactory();
#pragma warning restore IDISP001
        var buffer = new List<float>();
        var samplesSinceLastEmit = 0;
        var totalSamples = 0L;
        var windowSamples = StreamSampleRate * StreamWindowMs / 1000;
        var maxBufferSamples = StreamSampleRate * StreamMaxBufferSeconds;
        var committed = new StringBuilder();

        var chunksReceived = 0;
        var chunksPassedVad = 0;
        var partialsEmitted = 0;
        double peakRms = 0;

        try
        {
            await foreach (var chunk in chunks.WithCancellation(ct))
            {
                chunksReceived++;
                
                _logger.LogDebug("[STREAM] Chunk #{ChunksReceived}: {Length} samples, RMS={Rms:F4}", 
                    chunksReceived, chunk.Samples.Length, peakRms);

                if (chunk.SampleRate != StreamSampleRate)
                {
                    throw new InvalidOperationException(
                        $"Streaming expects {StreamSampleRate} Hz mono samples, got {chunk.SampleRate} Hz");
                }

                if (chunk.Samples.Length > 0)
                {
                    double sum = 0;
                    for (int i = 0; i < chunk.Samples.Length; i++)
                    {
                        var s = chunk.Samples[i];
                        sum += s * s;
                    }
                    var rms = Math.Sqrt(sum / chunk.Samples.Length);
                    if (rms > peakRms) peakRms = rms;
                }

                if (!_vad.ContainsSpeech(chunk))
                {
                    continue;
                }
                chunksPassedVad++;

                _logger.LogDebug("[CHUNK] idx={ChunksReceived} samples={Length} rms={Rms:F4} vad_pass=true", 
                    chunksReceived, chunk.Samples.Length, peakRms);
                
                buffer.AddRange(chunk.Samples);
                samplesSinceLastEmit += chunk.Samples.Length;
                totalSamples += chunk.Samples.Length;

                if (buffer.Count > maxBufferSamples)
                {
                    var snapshot = buffer.ToArray();
                    var committedText = await TranscribeBufferAsync(whisperFactory, snapshot, language, initialPrompt, ct);
                    if (!string.IsNullOrWhiteSpace(committedText))
                    {
                        if (committed.Length > 0) committed.Append(' ');
                        committed.Append(committedText.Trim());
                    }
                    buffer.Clear();
                    samplesSinceLastEmit = 0;
                    _logger.LogInformation(
                        "Stream commit: buffer cap reached, committed chars={Chars}, total committed={TotalChars}",
                        committedText?.Length ?? 0, committed.Length);
                    continue;
                }

                if (samplesSinceLastEmit >= windowSamples)
                {
                    samplesSinceLastEmit = 0;
                    _ = _cache.TryGetValue(CacheKey, out _);
                    var prevBufferSize = buffer.Count;
                    var snapshot = buffer.ToArray();
                    var text = await TranscribeBufferAsync(whisperFactory, snapshot, language, initialPrompt, ct);

                    _logger.LogDebug("[EMIT] Window reached. Buffer size: {PrevSize}, samples: {Samples}", 
                        prevBufferSize, snapshot.Length);

                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        _logger.LogDebug("[TRANSCRIBE] Input: {Length} samples → Output: \"{Text}\"", 
                            snapshot.Length, text ?? "(empty)");

                        if (committed.Length > 0) committed.Append(' ');
                        committed.Append(text.Trim());
                    }

                    buffer.Clear();

                    var emitted = committed.Length > 0
                        ? $"{committed}".Trim()
                        : string.Empty;
                    
                    if (!string.IsNullOrWhiteSpace(emitted))
                    {
                        partialsEmitted++;
                        yield return new PartialTranscript(
                            Text: emitted,
                            Timestamp: TimeSpan.FromSeconds((double)totalSamples / StreamSampleRate));
                    }

                    _logger.LogDebug("[EMIT] Cleared buffer. Previous size: {PrevSize}, committed chars: {Committed}", 
                        prevBufferSize, committed.Length);
                }
            }

            if (buffer.Count > 0)
            {
                var tail = buffer.ToArray();
                var text = await TranscribeBufferAsync(whisperFactory, tail, language, initialPrompt, ct);

                _logger.LogDebug("[TRANSCRIBE] Tail: {Length} samples → Output: \"{Text}\"", 
                    tail.Length, text ?? "(empty)");

                if (!string.IsNullOrWhiteSpace(text))
                {
                    if (committed.Length > 0) committed.Append(' ');
                    committed.Append(text.Trim());
                }

                buffer.Clear();

                var emitted = committed.Length > 0
                    ? $"{committed}".Trim()
                    : string.Empty;

                if (!string.IsNullOrWhiteSpace(emitted))
                {
                    partialsEmitted++;
                    yield return new PartialTranscript(
                        Text: emitted,
                        Timestamp: TimeSpan.FromSeconds((double)totalSamples / StreamSampleRate));
                }
            }
            else if (committed.Length > 0)
            {
                partialsEmitted++;
                yield return new PartialTranscript(
                    Text: committed.ToString().Trim(),
                    Timestamp: TimeSpan.FromSeconds((double)totalSamples / StreamSampleRate));
            }
        }
        finally
        {
            _logger.LogInformation(
                "Streaming transcription ended: chunks={ChunksReceived} vadPassed={ChunksPassedVad} partials={PartialsEmitted} peakRms={PeakRms:F5} committedChars={CommittedChars}",
                chunksReceived, chunksPassedVad, partialsEmitted, peakRms, committed.Length);
        }
    }

    private WhisperFactory GetOrCreateFactory()
    {
#pragma warning disable IDISP001, IDISP007
        var factory = _cache.GetOrCreate(CacheKey, entry =>
        {
            var unloadMinutes = Math.Max(0, _settings.DictationModelUnloadMinutes);
            var sliding = unloadMinutes == 0
                ? MinSlidingExpiration
                : TimeSpan.FromMinutes(unloadMinutes);
            entry.SlidingExpiration = sliding;
            entry.RegisterPostEvictionCallback(DisposeOnEviction);

            var modelPath = _settings.WhisperModelPath;
            if (string.IsNullOrWhiteSpace(modelPath) || !File.Exists(modelPath))
            {
                throw new InvalidOperationException(
                    $"Whisper model is not configured or missing on disk: '{modelPath}'. " +
                    "Download it via the Models page in Settings.");
            }
            _logger.LogInformation("Loading Whisper model {Model}", Path.GetFileName(modelPath));
            return WhisperFactory.FromPath(modelPath);
        });
#pragma warning restore IDISP001, IDISP007
        return factory!;
    }

    private static void DisposeOnEviction(object key, object? value, EvictionReason reason, object? state)
    {
#pragma warning disable IDISP007
        if (value is IDisposable disposable)
        {
            disposable.Dispose();
        }
#pragma warning restore IDISP007
    }

    public async Task<string> TranscribeSamplesAsync(
        float[] samples,
        string language,
        string? initialPrompt,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(samples);
        if (samples.Length == 0)
        {
            _logger.LogInformation("One-shot dictation transcription skipped: 0 samples");
            return string.Empty;
        }

        _logger.LogInformation(
            "One-shot dictation transcription start: {Samples} samples (~{DurationMs} ms)",
            samples.Length, samples.Length * 1000L / StreamSampleRate);

#pragma warning disable IDISP001
        var whisperFactory = GetOrCreateFactory();
#pragma warning restore IDISP001
        _ = _cache.TryGetValue(CacheKey, out _);

        await using var processor = BuildProcessor(whisperFactory, language, initialPrompt, BeamSize);

        var parts = new List<string>();
        await foreach (var segment in processor.ProcessAsync(samples, ct).WithCancellation(ct))
        {
            var text = segment.Text?.Trim();
            if (!string.IsNullOrEmpty(text))
            {
                parts.Add(text);
            }
        }

        var result = string.Join(" ", parts).Trim();
        _logger.LogInformation("One-shot dictation transcription done: {Chars} chars", result.Length);
        return result;
    }

    private async Task<string> TranscribeBufferAsync(
        WhisperFactory whisperFactory,
        float[] samples,
        string language,
        string? initialPrompt,
        CancellationToken ct)
    {
        await using var processor = BuildProcessor(whisperFactory, language, initialPrompt, StreamBeamSize);

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

    private static WhisperProcessor BuildProcessor(
        WhisperFactory factory, string language, string? initialPrompt, int beamSize = BeamSize)
    {
        var builder = factory.CreateBuilder()
            .WithLanguage(language)
            .WithPrompt(string.IsNullOrWhiteSpace(initialPrompt) ? DefaultPrompt : initialPrompt)
            .WithTemperature(0);

        var beamStrategy = builder.WithBeamSearchSamplingStrategy();
        if (beamStrategy is BeamSearchSamplingStrategyBuilder beamBuilder)
        {
            beamBuilder.WithBeamSize(beamSize);
        }

        return builder.Build();
    }
}
