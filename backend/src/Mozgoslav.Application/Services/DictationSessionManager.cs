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
/// </summary>
public sealed class DictationSessionManager : IDictationSessionManager
{
    private readonly IStreamingTranscriptionService _streaming;
    private readonly ILlmService _llm;
    private readonly IAppSettings _settings;
    private readonly ILogger<DictationSessionManager> _logger;

    private readonly ConcurrentDictionary<Guid, SessionRuntime> _sessions = new();
    private readonly Lock _activeSessionLock = new();
    private Guid? _activeSessionId;

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
        lock (_activeSessionLock)
        {
            if (_activeSessionId is not null)
            {
                throw new InvalidOperationException(
                    $"Dictation session {_activeSessionId} is already active. " +
                    "Stop or cancel it before starting a new one.");
            }

            var session = new DictationSession();
            // Ownership is transferred to the _sessions dictionary; StopAsync/CancelAsync dispose it.
#pragma warning disable IDISP001
            var runtime = new SessionRuntime(session);
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
            await foreach (var partial in _streaming.TranscribeStreamAsync(
                audioStream,
                _settings.DictationLanguage,
                initialPrompt: null,
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

    private void MarkError(SessionRuntime runtime, Exception ex)
    {
        runtime.Session.State = DictationState.Error;
        runtime.Session.ErrorMessage = ex.Message;
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

            const string systemPrompt =
                "Ты редактор русского текста. Тебе дают расшифровку голосового ввода. " +
                "Исправь пунктуацию, капитализацию, очевидные ошибки распознавания. " +
                "НЕ меняй смысл, НЕ добавляй ничего от себя, НЕ перефразируй. " +
                "Выведи только отредактированный текст — ничего больше.";
            var result = await _llm.ProcessAsync(rawText, systemPrompt, ct);
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
        public SessionRuntime(DictationSession session)
        {
            Session = session;
            var audioChannel = Channel.CreateUnbounded<AudioChunk>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
            });
            AudioReader = audioChannel.Reader;
            AudioWriter = audioChannel.Writer;
            Partials = Channel.CreateUnbounded<PartialTranscript>(new UnboundedChannelOptions
            {
                SingleReader = false,
                SingleWriter = true,
            });
            Cts = new CancellationTokenSource();
            TranscriptionTask = Task.CompletedTask;
            LastPartialText = string.Empty;
        }

        public DictationSession Session { get; }
        public ChannelReader<AudioChunk> AudioReader { get; }
        public ChannelWriter<AudioChunk> AudioWriter { get; }
        public Channel<PartialTranscript> Partials { get; }
        public CancellationTokenSource Cts { get; }
        public Task TranscriptionTask { get; set; }
        public string LastPartialText { get; set; }

        public void Dispose()
        {
            Cts.Dispose();
        }
    }
}
