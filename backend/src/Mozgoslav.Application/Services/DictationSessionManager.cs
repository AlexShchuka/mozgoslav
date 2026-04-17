using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Services;

/// <summary>
/// In-memory state-machine for push-to-talk dictation sessions. One instance is
/// a singleton that the Electron main process drives through the session
/// lifecycle: <c>Start</c> → <c>PushAudioAsync</c> repeatedly → <c>StopAsync</c>.
/// Partial transcripts flow through the per-session SSE channel that the
/// overlay subscribes to. Sessions are short-lived and never persisted.
/// <para>
/// ADR-004 R5: every audio chunk is also mirrored to a raw PCM file
/// (<c>dictation-{sessionId}.pcm</c>, float32 mono at the chunk's sample rate)
/// inside <see cref="IAppSettings.DictationTempAudioPath"/>. On clean stop or
/// cancel the file is deleted; if the app crashes the file is left behind so
/// the user can recover audio that never reached the LLM.
/// </para>
/// </summary>
public sealed class DictationSessionManager : IDictationSessionManager
{
    private const string PcmFilePrefix = "dictation-";
    private const string PcmFileExtension = ".pcm";

    private readonly IStreamingTranscriptionService _streaming;
    private readonly ILlmService _llm;
    private readonly IAppSettings _settings;
    private readonly ILogger<DictationSessionManager> _logger;

    private readonly ConcurrentDictionary<Guid, SessionRuntime> _sessions = new();
    private readonly Lock _activeSessionLock = new();
    private Guid? _activeSessionId;
    private int _orphanScanDone;

    public DictationSessionManager(
        IStreamingTranscriptionService streaming,
        ILlmService llm,
        IAppSettings settings,
        ILogger<DictationSessionManager> logger)
    {
        _streaming = streaming;
        _llm = llm;
        _settings = settings;
        _logger = logger;
    }

    public DictationSession Start()
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

            var session = new DictationSession();
            var audioBufferPath = TryPrepareAudioBufferPath(session.Id);
            // Ownership is transferred to the _sessions dictionary; StopAsync/CancelAsync dispose it.
#pragma warning disable IDISP001
            var runtime = new SessionRuntime(session, audioBufferPath);
#pragma warning restore IDISP001
            if (!_sessions.TryAdd(session.Id, runtime))
            {
                runtime.Dispose();
                throw new InvalidOperationException($"Session id collision: {session.Id}");
            }

            _activeSessionId = session.Id;
            // The loop owns the runtime's CTS for the whole session; StopAsync/CancelAsync
            // complete or cancel the task before the runtime is disposed.
#pragma warning disable CA2025
            runtime.TranscriptionTask = RunTranscriptionLoopAsync(runtime);
#pragma warning restore CA2025

            _logger.LogInformation("Dictation session {SessionId} started", session.Id);
            return session;
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
        return runtime.AudioWriter.WriteAsync(chunk, ct);
    }

    public IAsyncEnumerable<PartialTranscript> SubscribePartialsAsync(
        Guid sessionId,
        CancellationToken ct)
    {
        // Resolve the runtime synchronously so callers get KeyNotFoundException
        // immediately rather than on the first MoveNextAsync (which is deferred).
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

    public async Task<FinalTranscript> StopAsync(Guid sessionId, CancellationToken ct)
    {
        var runtime = GetRuntimeOrThrow(sessionId);

        runtime.Session.State = DictationState.Processing;
        runtime.AudioWriter.TryComplete();

        // Wait for the transcription loop to drain and the final partial to settle.
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
            MarkError(runtime, ex);
            throw;
        }

        var duration = DateTime.UtcNow - runtime.Session.StartedAt;
        var rawText = runtime.LastPartialText;

        var polished = rawText;
        if (_settings.DictationLlmPolish && !string.IsNullOrWhiteSpace(rawText))
        {
            polished = await PolishAsync(rawText, ct);
        }

        runtime.Session.State = DictationState.Injecting;
        runtime.Session.FinishedAt = DateTime.UtcNow;
        runtime.Partials.Writer.TryComplete();

        ClearActive(sessionId);
        _sessions.TryRemove(sessionId, out _);
        DeleteAudioBuffer(runtime);
        runtime.Dispose();

        _logger.LogInformation(
            "Dictation session {SessionId} finalized in {Duration} ms, {Chars} chars",
            sessionId, duration.TotalMilliseconds, rawText.Length);

        return new FinalTranscript(rawText, polished, duration);
    }

    public Task CancelAsync(Guid sessionId, CancellationToken ct)
    {
        if (!_sessions.TryRemove(sessionId, out var runtime))
        {
            return Task.CompletedTask;
        }

        runtime.Cts.Cancel();
        runtime.AudioWriter.TryComplete();
        runtime.Partials.Writer.TryComplete();
        runtime.Session.State = DictationState.Idle;
        runtime.Session.FinishedAt = DateTime.UtcNow;

        ClearActive(sessionId);
        DeleteAudioBuffer(runtime);
        runtime.Dispose();
        _logger.LogInformation("Dictation session {SessionId} cancelled", sessionId);
        return Task.CompletedTask;
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
                initialPrompt: BuildInitialPrompt(_settings.DictationVocabulary),
                runtime.Cts.Token))
            {
                runtime.LastPartialText = partial.Text;
                await runtime.Partials.Writer.WriteAsync(partial, runtime.Cts.Token);
            }
        }
        catch (OperationCanceledException)
        {
            // expected on cancel
        }
        catch (Exception ex)
        {
            MarkError(runtime, ex);
        }
    }

    /// <summary>
    /// Pass-through iterator that writes every chunk's PCM samples to the
    /// per-session crash-recovery buffer before yielding it to Whisper.
    /// Buffer write errors are logged and do not abort the session.
    /// </summary>
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

    /// <summary>
    /// Assembles the <c>initial_prompt</c> (ADR-004 R1) that biases Whisper toward
    /// domain-specific vocabulary. Returning <c>null</c> preserves the transcription
    /// service's built-in default so an empty vocabulary is not a regression.
    /// </summary>
    private static string? BuildInitialPrompt(IReadOnlyList<string> vocabulary)
    {
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

    private async Task<string> PolishAsync(string rawText, CancellationToken ct)
    {
        try
        {
            if (!await _llm.IsAvailableAsync(ct))
            {
                _logger.LogInformation("LLM unavailable, skipping dictation polish");
                return rawText;
            }

            const string SystemPrompt =
                "Ты редактор русского текста. Тебе дают расшифровку голосового ввода. " +
                "Исправь пунктуацию, капитализацию, очевидные ошибки распознавания. " +
                "НЕ меняй смысл, НЕ добавляй ничего от себя, НЕ перефразируй. " +
                "Выведи только отредактированный текст — ничего больше.";
            var result = await _llm.ProcessAsync(rawText, SystemPrompt, ct);
            return string.IsNullOrWhiteSpace(result.Summary) ? rawText : result.Summary.Trim();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dictation LLM polish failed, returning raw text");
            return rawText;
        }
    }

    private sealed class SessionRuntime : IDisposable
    {
        public SessionRuntime(DictationSession session, string? audioBufferPath)
        {
            Session = session;
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
            Cts = new CancellationTokenSource();
            TranscriptionTask = Task.CompletedTask;
            LastPartialText = string.Empty;
            AudioBufferPath = audioBufferPath;
            if (audioBufferPath is not null)
            {
                // Owned by the runtime — disposed in CloseAudioBuffer / Dispose.
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
        public ChannelReader<AudioChunk> AudioReader { get; }
        public ChannelWriter<AudioChunk> AudioWriter { get; }
        public Channel<PartialTranscript> Partials { get; }
        public CancellationTokenSource Cts { get; }
        public Task TranscriptionTask { get; set; }
        public string LastPartialText { get; set; }
        public string? AudioBufferPath { get; }
        public FileStream? AudioBuffer { get; private set; }

        public void CloseAudioBuffer()
        {
            AudioBuffer?.Dispose();
            AudioBuffer = null;
        }

        public void Dispose()
        {
            CloseAudioBuffer();
            Cts.Dispose();
        }
    }
}
