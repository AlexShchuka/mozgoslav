using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// <see cref="IDictationPcmStream"/> backed by a long-running <c>ffmpeg</c>
/// process per session. The browser's <c>MediaRecorder</c> splits a single
/// WebM/Opus recording into many chunks whose bodies are header-less EBML
/// clusters; feeding them through one-shot ffmpeg invocations fails with exit
/// code 183 (invalid data). Holding ffmpeg's stdin open for the duration of
/// the session lets EBML parsing see the original header + the clusters in
/// order, producing PCM continuously on stdout.
/// <para>
/// This path deliberately shells out via <see cref="Process"/> instead of
/// CliWrap because we need interleaved reads and writes against the process's
/// standard streams; CliWrap is optimised for one-shot request/response
/// shapes. Stderr is forwarded to the logger so D4 regressions surface as
/// structured log entries rather than silent decode failures.
/// </para>
/// </summary>
public sealed class FfmpegPcmStreamService : IDictationPcmStream, IAsyncDisposable
{
    private const string FfmpegExecutable = "ffmpeg";
    private const int DefaultSampleRate = 16_000;
    private const int PcmChunkBytes = 16_000 * sizeof(float); // ~1 s of audio per pump.
    private static readonly TimeSpan DrainTimeout = TimeSpan.FromSeconds(5);

    private readonly ILogger<FfmpegPcmStreamService> _logger;
    private readonly ConcurrentDictionary<Guid, Session> _sessions = new();

    public FfmpegPcmStreamService(ILogger<FfmpegPcmStreamService> logger)
    {
        _logger = logger;
    }

    public int TargetSampleRate => DefaultSampleRate;

    public Task StartAsync(Guid sessionId, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var startInfo = new ProcessStartInfo
        {
            FileName = FfmpegExecutable,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        startInfo.ArgumentList.Add("-hide_banner");
        startInfo.ArgumentList.Add("-loglevel");
        startInfo.ArgumentList.Add("error");
        startInfo.ArgumentList.Add("-f");
        startInfo.ArgumentList.Add("webm");
        startInfo.ArgumentList.Add("-i");
        startInfo.ArgumentList.Add("pipe:0");
        startInfo.ArgumentList.Add("-f");
        startInfo.ArgumentList.Add("f32le");
        startInfo.ArgumentList.Add("-ac");
        startInfo.ArgumentList.Add("1");
        startInfo.ArgumentList.Add("-ar");
        startInfo.ArgumentList.Add(
            DefaultSampleRate.ToString(CultureInfo.InvariantCulture));
        startInfo.ArgumentList.Add("pipe:1");

#pragma warning disable IDISP001 // Ownership transferred to Session.
        var process = new Process { StartInfo = startInfo };
#pragma warning restore IDISP001
        try
        {
            process.Start();
        }
        catch (System.ComponentModel.Win32Exception ex)
        {
            process.Dispose();
            throw new InvalidOperationException(
                "ffmpeg binary not found on PATH. Install via 'brew install ffmpeg' on macOS " +
                "(or 'apt-get install ffmpeg' on Linux).", ex);
        }
        catch
        {
            process.Dispose();
            throw;
        }

#pragma warning disable IDISP001 // Ownership transferred to _sessions (removed on Stop/Cancel/Dispose).
        var session = new Session(sessionId);
#pragma warning restore IDISP001
        session.AttachProcess(process);

        if (!_sessions.TryAdd(sessionId, session))
        {
#pragma warning disable IDISP016 // The local wrapper never reached _sessions; safe to dispose.
            session.Dispose();
#pragma warning restore IDISP016
            throw new InvalidOperationException(
                $"Dictation PCM stream for session {sessionId} is already active.");
        }

#pragma warning disable CA2025 // Tasks live for the session lifetime; Stop/Cancel awaits / cancels them.
        session.StdoutPump = Task.Run(() => PumpStdoutAsync(session), CancellationToken.None);
        session.StderrPump = Task.Run(() => PumpStderrAsync(session), CancellationToken.None);
#pragma warning restore CA2025

        _logger.LogInformation(
            "ffmpeg PCM stream for session {SessionId} started (pid={Pid})",
            sessionId, process.Id);
        return Task.CompletedTask;
    }

    public async Task WriteAsync(Guid sessionId, byte[] chunk, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(chunk);
        var session = GetOrThrow(sessionId);
        if (chunk.Length == 0)
        {
            return;
        }

        var stdin = session.Stdin
            ?? throw new InvalidOperationException(
                $"ffmpeg stdin for session {sessionId} is not available.");

        await session.WriteLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            await stdin.WriteAsync(chunk.AsMemory(), ct).ConfigureAwait(false);
            await stdin.FlushAsync(ct).ConfigureAwait(false);
        }
        catch (IOException ex)
        {
            _logger.LogWarning(ex,
                "ffmpeg stdin write failed for session {SessionId} (stderr={Stderr})",
                sessionId, session.SnapshotStderr());
            throw new InvalidOperationException(
                $"ffmpeg stdin write failed for session {sessionId}: {ex.Message}", ex);
        }
        finally
        {
            session.WriteLock.Release();
        }
    }

    public async Task<float[]> StopAsync(Guid sessionId, CancellationToken ct)
    {
        if (!_sessions.TryRemove(sessionId, out var session))
        {
            return [];
        }

        try
        {
            await session.WriteLock.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                session.Stdin?.Close();
            }
            finally
            {
                session.WriteLock.Release();
            }

            using var drainCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            drainCts.CancelAfter(DrainTimeout);
            try
            {
                if (session.StdoutPump is not null)
                {
                    await session.StdoutPump.WaitAsync(drainCts.Token).ConfigureAwait(false);
                }
                if (session.Process is not null)
                {
                    await session.Process.WaitForExitAsync(drainCts.Token).ConfigureAwait(false);
                }
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "ffmpeg drain timed out for session {SessionId} after {Timeout} — killing process",
                    sessionId, DrainTimeout);
                TryKill(session);
            }

            if (session.StderrPump is not null)
            {
                try
                {
                    await session.StderrPump.WaitAsync(TimeSpan.FromSeconds(1), CancellationToken.None).ConfigureAwait(false);
                }
                catch (TimeoutException)
                {
                }
            }

            var exitCode = session.Process?.ExitCode ?? -1;
            if (exitCode != 0)
            {
                var stderr = session.SnapshotStderr();
                _logger.LogWarning(
                    "ffmpeg PCM stream for session {SessionId} exited with code {ExitCode}: {Stderr}",
                    sessionId, exitCode, stderr);
                throw new InvalidOperationException(
                    $"ffmpeg PCM stream exited with code {exitCode}: {stderr}");
            }

            _logger.LogInformation(
                "ffmpeg PCM stream for session {SessionId} stopped cleanly", sessionId);
            return [];
        }
        finally
        {
            session.Writer.TryComplete();
            session.Dispose();
        }
    }

    public ChannelReader<float[]> GetReader(Guid sessionId) => GetOrThrow(sessionId).Reader;

    public Task CancelAsync(Guid sessionId, CancellationToken ct)
    {
        if (!_sessions.TryRemove(sessionId, out var session))
        {
            return Task.CompletedTask;
        }

        TryKill(session);
        session.Writer.TryComplete();
        session.Dispose();
        _logger.LogInformation("ffmpeg PCM stream for session {SessionId} cancelled", sessionId);
        return Task.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var sessionId in _sessions.Keys.ToArray())
        {
            try
            {
                await CancelAsync(sessionId, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Error cancelling PCM stream for session {SessionId} during dispose",
                    sessionId);
            }
        }
    }

    private Session GetOrThrow(Guid sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
        {
            throw new KeyNotFoundException(
                $"Dictation PCM stream for session {sessionId} not found.");
        }
        return session;
    }

    private async Task PumpStdoutAsync(Session session)
    {
        try
        {
            if (session.Stdout is null)
            {
                return;
            }

            var buffer = new byte[PcmChunkBytes];
            while (true)
            {
                var read = await session.Stdout.ReadAsync(buffer).ConfigureAwait(false);
                if (read <= 0)
                {
                    break;
                }
                if (read % sizeof(float) != 0)
                {
                    _logger.LogWarning(
                        "ffmpeg emitted {Bytes} bytes (not a multiple of 4) for session {SessionId}",
                        read, session.Id);
                    continue;
                }
                var samples = new float[read / sizeof(float)];
                Buffer.BlockCopy(buffer, 0, samples, 0, read);
                await session.Writer.WriteAsync(samples).ConfigureAwait(false);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "ffmpeg stdout pump failed for session {SessionId}", session.Id);
        }
        finally
        {
            session.Writer.TryComplete();
        }
    }

    private async Task PumpStderrAsync(Session session)
    {
        try
        {
            if (session.Stderr is null)
            {
                return;
            }
            string? line;
            while ((line = await session.Stderr.ReadLineAsync().ConfigureAwait(false)) is not null)
            {
                session.AppendStderr(line);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex,
                "ffmpeg stderr pump ended for session {SessionId}", session.Id);
        }
    }

    private static void TryKill(Session session)
    {
        try
        {
            if (session.Process is { HasExited: false } proc)
            {
                proc.Kill(entireProcessTree: true);
            }
        }
        catch (InvalidOperationException)
        {
        }
    }

    private sealed class Session : IDisposable
    {
        private readonly StringBuilder _stderr = new();
        private readonly Lock _stderrLock = new();
        private readonly Channel<float[]> _channel;

        public Session(Guid id)
        {
            Id = id;
            _channel = Channel.CreateUnbounded<float[]>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = true
            });
            Reader = _channel.Reader;
            Writer = _channel.Writer;
            WriteLock = new SemaphoreSlim(1, 1);
        }

        public Guid Id { get; }
        public Process? Process { get; private set; }
        public Stream? Stdin { get; private set; }
        public Stream? Stdout { get; private set; }
        public StreamReader? Stderr { get; private set; }
        public Task? StdoutPump { get; set; }
        public Task? StderrPump { get; set; }
        public ChannelReader<float[]> Reader { get; }
        public ChannelWriter<float[]> Writer { get; }
        public SemaphoreSlim WriteLock { get; }

        public void AttachProcess(Process process)
        {
            Process = process;
            Stdin = process.StandardInput.BaseStream;
            Stdout = process.StandardOutput.BaseStream;
            Stderr = process.StandardError;
        }

        public void AppendStderr(string line)
        {
            lock (_stderrLock)
            {
                if (_stderr.Length < 4096)
                {
                    _stderr.AppendLine(line);
                }
            }
        }

        public string SnapshotStderr()
        {
            lock (_stderrLock)
            {
                return _stderr.ToString();
            }
        }

        public void Dispose()
        {
            try
            {
#pragma warning disable IDISP007
                Process?.Dispose();
#pragma warning restore IDISP007
            }
            catch (InvalidOperationException)
            {
            }
            WriteLock.Dispose();
        }
    }
}
