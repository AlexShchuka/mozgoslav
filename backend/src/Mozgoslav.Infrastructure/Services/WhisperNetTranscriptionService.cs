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
    internal const int StreamSampleRate = 16_000;
    internal const int StreamWindowMs = 300;
    internal const int StreamMaxBufferSeconds = 15;
    private const int BeamSize = 5;
    private const int StreamBeamSize = 1;
    private const string DefaultPrompt =
        "Мысли вслух, встречи, диалоги, рассуждения. Запятые, точки, тире, вопросительные и восклицательные знаки: так, ведь, вот — именно.";
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

    public IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
        IAsyncEnumerable<AudioChunk> chunks,
        string language,
        string? initialPrompt,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunks);

        _logger.LogInformation("Starting streaming transcription");
        _logger.LogDebug("Transcription parameters: language={Lang}, prompt={Prompt}",
            language, initialPrompt ?? "<none>");

#pragma warning disable IDISP001
        var whisperFactory = GetOrCreateFactory();
#pragma warning restore IDISP001

        return StreamCoreAsync(
            chunks,
            _vad,
            (samples, token) => TranscribeBufferAsync(whisperFactory, samples, language, initialPrompt, token),
            RefreshFactoryCache,
            _logger,
            ct);
    }

    internal static async IAsyncEnumerable<PartialTranscript> StreamCoreAsync(
        IAsyncEnumerable<AudioChunk> chunks,
        IVadPreprocessor vad,
        Func<float[], CancellationToken, Task<string>> transcribe,
        Action? onEmitWindow,
        ILogger logger,
        [EnumeratorCancellation] CancellationToken ct)
    {
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
        var firstReceivedLogged = false;
        var firstVadPassedLogged = false;

        try
        {
            await foreach (var chunk in chunks.WithCancellation(ct))
            {
                chunksReceived++;

                if (chunk.SampleRate != StreamSampleRate)
                {
                    throw new InvalidOperationException(
                        $"Streaming expects {StreamSampleRate} Hz mono samples, got {chunk.SampleRate} Hz");
                }

                var rms = ComputeRms(chunk.Samples);
                if (rms > peakRms)
                {
                    peakRms = rms;
                }

                logger.LogDebug("[STREAM] Chunk #{ChunksReceived}: {Length} samples, RMS={Rms:F4}",
                    chunksReceived, chunk.Samples.Length, rms);

                if (!firstReceivedLogged)
                {
                    var (rxMin, rxMax) = chunk.Samples.Length > 0 ? MinMax(chunk.Samples) : (0f, 0f);
                    logger.LogInformation(
                        "[SAMPLES] First received: length={Length} rms={Rms:F5} min={Min:F4} max={Max:F4} sampleRate={SampleRate}",
                        chunk.Samples.Length, rms, rxMin, rxMax, chunk.SampleRate);
                    firstReceivedLogged = true;
                }

                if (!vad.ContainsSpeech(chunk))
                {
                    continue;
                }

                chunksPassedVad++;

                if (!firstVadPassedLogged && chunk.Samples.Length > 0)
                {
                    var (min, max) = MinMax(chunk.Samples);
                    logger.LogInformation(
                        "[SAMPLES] First VAD-passed: length={Length} min={Min:F4} max={Max:F4}",
                        chunk.Samples.Length, min, max);

                    if (min < -1.01f || max > 1.01f)
                    {
                        logger.LogWarning(
                            "[SAMPLES] Out-of-range samples (min={Min:F4} max={Max:F4}); Whisper expects normalized [-1, 1] floats, upstream is sending un-normalized audio.",
                            min, max);
                    }

                    firstVadPassedLogged = true;
                }

                buffer.AddRange(chunk.Samples);
                samplesSinceLastEmit += chunk.Samples.Length;
                totalSamples += chunk.Samples.Length;

                if (buffer.Count > maxBufferSamples)
                {
                    var snapshot = buffer.ToArray();
                    var committedText = await transcribe(snapshot, ct);
                    if (!string.IsNullOrWhiteSpace(committedText))
                    {
                        if (committed.Length > 0)
                        {
                            committed.Append(' ');
                        }
                        committed.Append(committedText.Trim());
                    }
                    buffer.Clear();
                    samplesSinceLastEmit = 0;
                    logger.LogInformation(
                        "Stream commit: buffer cap reached, committed chars={Chars}, total committed={TotalChars}",
                        committedText?.Length ?? 0, committed.Length);
                    continue;
                }

                if (samplesSinceLastEmit >= windowSamples)
                {
                    samplesSinceLastEmit = 0;
                    onEmitWindow?.Invoke();
                    var prevBufferSize = buffer.Count;
                    var snapshot = buffer.ToArray();
                    var text = await transcribe(snapshot, ct);

                    logger.LogDebug("[EMIT] Window reached. Buffer size: {PrevSize}, samples: {Samples}",
                        prevBufferSize, snapshot.Length);
                    logger.LogDebug("[TRANSCRIBE] Input: {Length} samples → Output: \"{Text}\"",
                        snapshot.Length, text);

                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        if (committed.Length > 0)
                        {
                            committed.Append(' ');
                        }
                        committed.Append(text.Trim());
                    }

                    buffer.Clear();

                    var emitted = committed.Length > 0 ? committed.ToString().Trim() : string.Empty;
                    if (!string.IsNullOrWhiteSpace(emitted))
                    {
                        partialsEmitted++;
                        yield return new PartialTranscript(
                            Text: emitted,
                            Timestamp: TimeSpan.FromSeconds((double)totalSamples / StreamSampleRate));
                    }

                    logger.LogDebug("[EMIT] Cleared buffer. Previous size: {PrevSize}, committed chars: {Committed}",
                        prevBufferSize, committed.Length);
                }
            }

            if (buffer.Count > 0)
            {
                var tail = buffer.ToArray();
                var text = await transcribe(tail, ct);

                logger.LogDebug("[TRANSCRIBE] Tail: {Length} samples → Output: \"{Text}\"",
                    tail.Length, text ?? "(empty)");

                if (!string.IsNullOrWhiteSpace(text))
                {
                    if (committed.Length > 0)
                    {
                        committed.Append(' ');
                    }
                    committed.Append(text.Trim());
                }

                buffer.Clear();

                var emitted = committed.Length > 0 ? committed.ToString().Trim() : string.Empty;
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
            logger.LogInformation(
                "Streaming transcription ended: chunks={ChunksReceived} vadPassed={ChunksPassedVad} partials={PartialsEmitted} peakRms={PeakRms:F5} committedChars={CommittedChars}",
                chunksReceived, chunksPassedVad, partialsEmitted, peakRms, committed.Length);

            if (chunksReceived > 0 && peakRms < 0.0005)
            {
                logger.LogWarning(
                    "Streaming received {ChunksReceived} chunk(s) but peak RMS was {PeakRms:F5} — upstream audio looks silent. Check the mic helper: captured samples never reached non-zero amplitude.",
                    chunksReceived, peakRms);
            }
        }
    }

    private static double ComputeRms(float[] samples)
    {
        if (samples.Length == 0)
        {
            return 0;
        }

        double sum = 0;
        for (var i = 0; i < samples.Length; i++)
        {
            var s = samples[i];
            sum += s * s;
        }
        return Math.Sqrt(sum / samples.Length);
    }

    private static (float Min, float Max) MinMax(float[] samples)
    {
        var min = samples[0];
        var max = samples[0];
        for (var i = 1; i < samples.Length; i++)
        {
            var s = samples[i];
            if (s < min)
            {
                min = s;
            }
            if (s > max)
            {
                max = s;
            }
        }
        return (min, max);
    }

    private void RefreshFactoryCache()
    {
        if (_cache.TryGetValue(CacheKey, out _))
        {
            return;
        }

#pragma warning disable IDISP001, IDISP004
        _ = GetOrCreateFactory();
#pragma warning restore IDISP001, IDISP004
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

        var inputRms = ComputeRms(samples);
        var (inputMin, inputMax) = MinMax(samples);
        _logger.LogInformation(
            "One-shot dictation transcription start: {Samples} samples (~{DurationMs} ms) rms={Rms:F5} min={Min:F4} max={Max:F4}",
            samples.Length, samples.Length * 1000L / StreamSampleRate, inputRms, inputMin, inputMax);

#pragma warning disable IDISP001
        var whisperFactory = GetOrCreateFactory();
#pragma warning restore IDISP001
        RefreshFactoryCache();

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
        var preview = result.Length <= 120 ? result : string.Concat(result.AsSpan(0, 120), "…");
        _logger.LogInformation(
            "One-shot dictation transcription done: {Chars} chars text=\"{Preview}\"",
            result.Length, preview);

        if (result.Length >= 10 && inputRms < 0.0005)
        {
            _logger.LogWarning(
                "One-shot produced {Chars} chars on near-silent input (rms={Rms:F5}); Whisper is likely hallucinating from the initial prompt. Check the upstream audio source.",
                result.Length, inputRms);
        }

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
