using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

using DictationKind = Mozgoslav.Domain.Enums.DictationSessionKind;

using DomainProfile = Mozgoslav.Domain.Entities.Profile;

namespace Mozgoslav.Application.Services;

public sealed class DictationSessionManager : IDictationSessionManager
{
    private const string PcmFilePrefix = "dictation-";
    private const string PcmFileExtension = ".pcm";

    private readonly IStreamingTranscriptionService _streaming;
    private readonly ILlmService _llm;
    private readonly IAppSettings _settings;
    private readonly IPerAppCorrectionProfiles _perAppProfiles;
    private readonly IDictationPcmStream _pcmStream;
    private readonly IRecordingPartialsNotifier _recordingPartials;
    private readonly ILogger<DictationSessionManager> _logger;

    private readonly ConcurrentDictionary<Guid, SessionRuntime> _sessions = new();
    private readonly Lock _activeSessionLock = new();
    private Guid? _activeSessionId;
    private int _orphanScanDone;

    public DictationSessionManager(
        IStreamingTranscriptionService streaming,
        ILlmService llm,
        IAppSettings settings,
        IPerAppCorrectionProfiles perAppProfiles,
        IDictationPcmStream pcmStream,
        IRecordingPartialsNotifier recordingPartials,
        ILogger<DictationSessionManager> logger)
    {
        _streaming = streaming;
        _llm = llm;
        _settings = settings;
        _perAppProfiles = perAppProfiles;
        _pcmStream = pcmStream;
        _recordingPartials = recordingPartials;
        _logger = logger;
    }

    public DictationSession Start(string? source = null, DictationKind kind = DictationKind.Dictation, Guid? recordingId = null)
    {
        ScanForOrphanedAudioFilesOnce();

        lock (_activeSessionLock)
        {
            if (_activeSessionId is not null)
            {
                throw new InvalidOperationException(
                    $"Dictation session {_activeSessionId} is already active. " +
                    "Stop or cancel it before starting a new one.");
            }

            var session = new DictationSession { Source = source };
            var audioBufferPath = TryPrepareAudioBufferPath(session.Id);
#pragma warning disable IDISP001
            var runtime = new SessionRuntime(session, audioBufferPath, kind, recordingId);
#pragma warning restore IDISP001
            if (!_sessions.TryAdd(session.Id, runtime))
            {
                runtime.Dispose();
                throw new InvalidOperationException($"Session id collision: {session.Id}");
            }

            _activeSessionId = session.Id;
#pragma warning disable CA2025
            runtime.TranscriptionTask = RunTranscriptionLoopAsync(runtime);
#pragma warning restore CA2025

            _logger.LogInformation(
                "Dictation session {SessionId} started (source={Source})",
                session.Id, session.Source ?? "legacy");
            return session;
        }
    }

    public async Task PushRawChunkAsync(Guid sessionId, byte[] encodedChunk, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(encodedChunk);
        var runtime = GetRuntimeOrThrow(sessionId);
        if (runtime.Session.State != DictationState.Recording)
        {
            throw new InvalidOperationException(
                $"Session {sessionId} is not recording (state={runtime.Session.State}).");
        }

        await EnsurePcmStreamAsync(runtime, ct).ConfigureAwait(false);
        await _pcmStream.WriteAsync(sessionId, encodedChunk, ct).ConfigureAwait(false);
    }

    private async Task EnsurePcmStreamAsync(SessionRuntime runtime, CancellationToken ct)
    {
        if (runtime.PcmStreamStarted)
        {
            return;
        }
        await runtime.PcmStartLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            if (runtime.PcmStreamStarted)
            {
                return;
            }
            await _pcmStream.StartAsync(runtime.Session.Id, ct).ConfigureAwait(false);
            runtime.PcmStreamStarted = true;
#pragma warning disable CA2025
            runtime.PcmForwardTask = ForwardDecodedPcmAsync(runtime);
#pragma warning restore CA2025
        }
        finally
        {
            runtime.PcmStartLock.Release();
        }
    }

    private async Task ForwardDecodedPcmAsync(SessionRuntime runtime)
    {
        try
        {
            var reader = _pcmStream.GetReader(runtime.Session.Id);
            await foreach (var samples in reader.ReadAllAsync(runtime.Cts.Token))
            {
                if (samples.Length == 0)
                {
                    continue;
                }
                var chunk = new AudioChunk(
                    Samples: samples,
                    SampleRate: _pcmStream.TargetSampleRate,
                    Offset: TimeSpan.Zero);
                runtime.AccumulatedChunks.Enqueue(chunk);
                await runtime.AudioWriter.WriteAsync(chunk, runtime.Cts.Token).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to forward decoded PCM for session {SessionId}", runtime.Session.Id);
        }
    }

    public ValueTask PushAudioAsync(Guid sessionId, AudioChunk chunk, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunk);
        var runtime = GetRuntimeOrThrow(sessionId);
        if (runtime.Session.State != DictationState.Recording)
        {
            throw new InvalidOperationException(
                $"Session {sessionId} is not recording (state={runtime.Session.State}).");
        }
        runtime.AccumulatedChunks.Enqueue(chunk);
        return runtime.AudioWriter.WriteAsync(chunk, ct);
    }

    public IAsyncEnumerable<PartialTranscript> SubscribePartialsAsync(
        Guid sessionId,
        CancellationToken ct)
    {
        var runtime = GetRuntimeOrThrow(sessionId);
        return DrainPartialsAsync(runtime, ct);
    }

    private static async IAsyncEnumerable<PartialTranscript> DrainPartialsAsync(
        SessionRuntime runtime,
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var partial in runtime.Partials.Reader.ReadAllAsync(ct))
        {
            yield return partial;
        }
    }

    public async Task<FinalTranscript> StopAsync(Guid sessionId, CancellationToken ct, string? bundleId = null)
    {
        var runtime = GetRuntimeOrThrow(sessionId);

        runtime.Session.State = DictationState.Processing;

        if (runtime.PcmStreamStarted)
        {
            try
            {
                await _pcmStream.StopAsync(sessionId, ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is InvalidOperationException or IOException)
            {
                _logger.LogWarning(ex,
                    "ffmpeg PCM stream stop failed for session {SessionId}", sessionId);
            }
            if (runtime.PcmForwardTask is not null)
            {
                try
                {
                    await runtime.PcmForwardTask.WaitAsync(ct).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "PCM forwarder failed for session {SessionId}", sessionId);
                }
            }
        }

        runtime.AudioWriter.TryComplete();

        try
        {
            await runtime.TranscriptionTask.WaitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Streaming preview task failed for session {SessionId}; continuing with one-shot transcription",
                sessionId);
        }

        var duration = DateTime.UtcNow - runtime.Session.StartedAt;

        if (runtime.Kind == DictationKind.Longform)
        {
            runtime.Session.State = DictationState.Injecting;
            runtime.Session.FinishedAt = DateTime.UtcNow;
            runtime.Partials.Writer.TryComplete();

            ClearActive(sessionId);
            _sessions.TryRemove(sessionId, out _);
            DeleteAudioBuffer(runtime);
            runtime.Dispose();

            _logger.LogInformation(
                "Longform session {SessionId} stopped in {Duration} ms (stream discarded; canonical transcript deferred)",
                sessionId, duration.TotalMilliseconds);

            return new FinalTranscript(string.Empty, string.Empty, duration);
        }

        var accumulated = FlattenChunks(runtime.AccumulatedChunks);

        string rawText;
        try
        {
            rawText = await _streaming.TranscribeSamplesAsync(
                accumulated,
                _settings.DictationLanguage,
                BuildInitialPrompt(runtime.Profile, _settings.DictationVocabulary),
                ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            MarkError(runtime, ex);
            throw;
        }

        var profile = _perAppProfiles.Resolve(bundleId);
        var glossaryApplied = ApplyGlossary(rawText, profile);

        var polished = glossaryApplied;
        if (_settings.DictationLlmPolish && !string.IsNullOrWhiteSpace(glossaryApplied))
        {
            polished = await PolishAsync(glossaryApplied, profile, ct);
        }

        runtime.Session.State = DictationState.Injecting;
        runtime.Session.FinishedAt = DateTime.UtcNow;
        runtime.Partials.Writer.TryComplete();

        ClearActive(sessionId);
        _sessions.TryRemove(sessionId, out _);
        DeleteAudioBuffer(runtime);
        runtime.Dispose();

        _logger.LogInformation(
            "Dictation session {SessionId} finalized in {Duration} ms, {Chars} chars ({Samples} samples)",
            sessionId, duration.TotalMilliseconds, rawText.Length, accumulated.Length);

        return new FinalTranscript(rawText, polished, duration);
    }

    private static float[] FlattenChunks(ConcurrentQueue<AudioChunk> chunks)
    {
        var total = 0;
        foreach (var chunk in chunks)
        {
            total += chunk.Samples.Length;
        }
        if (total == 0)
        {
            return [];
        }
        var result = new float[total];
        var idx = 0;
        foreach (var chunk in chunks)
        {
            Array.Copy(chunk.Samples, 0, result, idx, chunk.Samples.Length);
            idx += chunk.Samples.Length;
        }
        return result;
    }

    public async Task CancelAsync(Guid sessionId, CancellationToken ct)
    {
        if (!_sessions.TryRemove(sessionId, out var runtime))
        {
            return;
        }

        runtime.Cts.Cancel();
        if (runtime.PcmStreamStarted)
        {
            try
            {
                await _pcmStream.CancelAsync(sessionId, ct).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "ffmpeg PCM stream cancel failed for session {SessionId}", sessionId);
            }
        }
        runtime.AudioWriter.TryComplete();
        runtime.Partials.Writer.TryComplete();
        runtime.Session.State = DictationState.Idle;
        runtime.Session.FinishedAt = DateTime.UtcNow;

        ClearActive(sessionId);
        DeleteAudioBuffer(runtime);
        runtime.Dispose();
        _logger.LogInformation("Dictation session {SessionId} cancelled", sessionId);
    }

    public DictationSession? TryGet(Guid sessionId) =>
        _sessions.TryGetValue(sessionId, out var runtime) ? runtime.Session : null;

    private SessionRuntime GetRuntimeOrThrow(Guid sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var runtime))
        {
            throw new KeyNotFoundException($"Dictation session {sessionId} not found.");
        }
        return runtime;
    }

    private void ClearActive(Guid sessionId)
    {
        lock (_activeSessionLock)
        {
            if (_activeSessionId == sessionId)
            {
                _activeSessionId = null;
            }
        }
    }

    private async Task RunTranscriptionLoopAsync(SessionRuntime runtime)
    {
        try
        {
            var audioStream = runtime.AudioReader.ReadAllAsync(runtime.Cts.Token);
            var teedAudio = TeeAudioToBufferAsync(audioStream, runtime, runtime.Cts.Token);
            await foreach (var partial in _streaming.TranscribeStreamAsync(
                teedAudio,
                _settings.DictationLanguage,
                initialPrompt: BuildInitialPrompt(runtime.Profile, _settings.DictationVocabulary),
                runtime.Cts.Token))
            {
                runtime.LastPartialText = partial.Text;
                if (runtime.Kind == DictationKind.Longform && runtime.RecordingId is not null)
                {
                    var payload = new RecordingPartialPayload(
                        RecordingId: runtime.RecordingId.Value,
                        SessionId: runtime.Session.Id,
                        Text: partial.Text,
                        StartSeconds: partial.Timestamp.TotalSeconds,
                        EndSeconds: partial.Timestamp.TotalSeconds,
                        IsFinal: false,
                        ObservedAt: DateTimeOffset.UtcNow);
                    _recordingPartials.Publish(payload);
                }
                else
                {
                    await runtime.Partials.Writer.WriteAsync(partial, runtime.Cts.Token);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            MarkError(runtime, ex);
        }
    }

    private async IAsyncEnumerable<AudioChunk> TeeAudioToBufferAsync(
        IAsyncEnumerable<AudioChunk> source,
        SessionRuntime runtime,
        [EnumeratorCancellation] CancellationToken ct)
    {
        await foreach (var chunk in source.WithCancellation(ct))
        {
            if (runtime.AudioBuffer is not null)
            {
                try
                {
                    var byteCount = chunk.Samples.Length * sizeof(float);
                    var bytes = new byte[byteCount];
                    Buffer.BlockCopy(chunk.Samples, 0, bytes, 0, byteCount);
                    await runtime.AudioBuffer.WriteAsync(bytes, ct);
                    await runtime.AudioBuffer.FlushAsync(ct);
                }
                catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
                {
                    _logger.LogWarning(ex,
                        "Failed to write dictation audio buffer for session {SessionId}",
                        runtime.Session.Id);
                }
            }
            yield return chunk;
        }
    }

    private string? TryPrepareAudioBufferPath(Guid sessionId)
    {
        try
        {
            var dir = ResolveAudioBufferDirectory();
            Directory.CreateDirectory(dir);
            return Path.Combine(dir, $"{PcmFilePrefix}{sessionId:D}{PcmFileExtension}");
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex,
                "Could not prepare dictation audio buffer directory; crash recovery disabled");
            return null;
        }
    }

    private string ResolveAudioBufferDirectory()
    {
        var configured = _settings.DictationTempAudioPath;
        return string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(Path.GetTempPath(), "mozgoslav-dictation")
            : configured;
    }

    private void DeleteAudioBuffer(SessionRuntime runtime)
    {
        runtime.CloseAudioBuffer();
        if (runtime.AudioBufferPath is null)
        {
            return;
        }
        try
        {
            if (File.Exists(runtime.AudioBufferPath))
            {
                File.Delete(runtime.AudioBufferPath);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex,
                "Could not delete dictation audio buffer {Path}", runtime.AudioBufferPath);
        }
    }

    private void ScanForOrphanedAudioFilesOnce()
    {
        if (Interlocked.CompareExchange(ref _orphanScanDone, 1, 0) != 0)
        {
            return;
        }
        try
        {
            var dir = ResolveAudioBufferDirectory();
            if (!Directory.Exists(dir))
            {
                return;
            }
            var orphans = Directory.EnumerateFiles(dir, $"{PcmFilePrefix}*{PcmFileExtension}").ToArray();
            if (orphans.Length > 0)
            {
                _logger.LogWarning(
                    "Found {Count} orphaned dictation audio files in {Dir} — leaving for recovery",
                    orphans.Length, dir);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogDebug(ex, "Orphan scan skipped");
        }
    }

    public static string? BuildInitialPrompt(DomainProfile? profile, IReadOnlyList<string>? vocabulary)
    {
        var overrideText = profile?.TranscriptionPromptOverride;
        if (!string.IsNullOrWhiteSpace(overrideText))
        {
            return overrideText.Trim();
        }

        if (vocabulary is null || vocabulary.Count == 0)
        {
            return null;
        }
        var cleaned = vocabulary
            .Where(term => !string.IsNullOrWhiteSpace(term))
            .Select(term => term.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        return cleaned.Length == 0 ? null : string.Join(", ", cleaned);
    }

    private void MarkError(SessionRuntime runtime, Exception ex)
    {
        runtime.Session.State = DictationState.Error;
        runtime.Partials.Writer.TryComplete(ex);
        _logger.LogError(ex, "Dictation session {SessionId} failed", runtime.Session.Id);
    }

    private async Task<string> PolishAsync(string rawText, PerAppCorrectionProfile profile, CancellationToken ct)
    {
        try
        {
            if (!await _llm.IsAvailableAsync(ct))
            {
                _logger.LogInformation("LLM unavailable, skipping dictation polish");
                return rawText;
            }

            const string BasePrompt =
                "Ты редактор русского текста. Тебе дают расшифровку голосового ввода. " +
                "Исправь пунктуацию, капитализацию, очевидные ошибки распознавания. " +
                "НЕ меняй смысл, НЕ добавляй ничего от себя, НЕ перефразируй. " +
                "Выведи только отредактированный текст — ничего больше.";
            var systemPrompt = string.IsNullOrWhiteSpace(profile.SystemPromptSuffix)
                ? BasePrompt
                : $"{BasePrompt} {profile.SystemPromptSuffix}";
            var result = await _llm.ProcessAsync(rawText, systemPrompt, ct);
            return string.IsNullOrWhiteSpace(result.Summary) ? rawText : result.Summary.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dictation LLM polish failed, returning raw text");
            return rawText;
        }
    }

    private static string ApplyGlossary(string text, PerAppCorrectionProfile profile)
    {
        if (string.IsNullOrEmpty(text) || profile.Glossary.Count == 0)
        {
            return text;
        }
        var result = text;
        foreach (var (from, to) in profile.Glossary)
        {
            if (!string.IsNullOrEmpty(from))
            {
                result = result.Replace(from, to, StringComparison.Ordinal);
            }
        }
        return result;
    }

    private sealed class SessionRuntime : IDisposable
    {
        public SessionRuntime(DictationSession session, string? audioBufferPath, DictationKind kind, Guid? recordingId)
        {
            Session = session;
            Kind = kind;
            RecordingId = recordingId;
            var audioChannel = Channel.CreateUnbounded<AudioChunk>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false
            });
            AudioReader = audioChannel.Reader;
            AudioWriter = audioChannel.Writer;
            Partials = Channel.CreateUnbounded<PartialTranscript>(new UnboundedChannelOptions
            {
                SingleReader = false,
                SingleWriter = true
            });
            AccumulatedChunks = new ConcurrentQueue<AudioChunk>();
            Cts = new CancellationTokenSource();
            TranscriptionTask = Task.CompletedTask;
            LastPartialText = string.Empty;
            PcmStartLock = new SemaphoreSlim(1, 1);
            AudioBufferPath = audioBufferPath;
            if (audioBufferPath is not null)
            {
#pragma warning disable IDISP001
                AudioBuffer = new FileStream(
                    audioBufferPath,
                    FileMode.Create,
                    FileAccess.Write,
                    FileShare.Read);
#pragma warning restore IDISP001
            }
        }

        public DictationSession Session { get; }
        public DictationKind Kind { get; }
        public Guid? RecordingId { get; }
        public ChannelReader<AudioChunk> AudioReader { get; }
        public ChannelWriter<AudioChunk> AudioWriter { get; }
        public Channel<PartialTranscript> Partials { get; }
        public ConcurrentQueue<AudioChunk> AccumulatedChunks { get; }
        public CancellationTokenSource Cts { get; }
        public Task TranscriptionTask { get; set; }
        public string LastPartialText { get; set; }
        public string? AudioBufferPath { get; }
        public FileStream? AudioBuffer { get; private set; }
        public SemaphoreSlim PcmStartLock { get; }
        public bool PcmStreamStarted { get; set; }
        public Task? PcmForwardTask { get; set; }
        public DomainProfile? Profile { get; set; }

        public void CloseAudioBuffer()
        {
            AudioBuffer?.Dispose();
            AudioBuffer = null;
        }

        public void Dispose()
        {
            CloseAudioBuffer();
            Cts.Dispose();
            PcmStartLock.Dispose();
        }
    }
}
