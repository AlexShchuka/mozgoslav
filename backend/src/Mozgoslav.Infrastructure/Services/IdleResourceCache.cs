using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Generic single-slot cache that lazily creates a heavy resource on first
/// <see cref="AcquireAsync"/> and disposes it after a configurable idle period.
/// ADR-004 R4: used by <see cref="WhisperNetTranscriptionService"/> to unload
/// the Whisper model from memory when the user hasn't dictated for N minutes.
/// <para>
/// Callers must pair every <see cref="AcquireAsync"/> with exactly one
/// <see cref="ReleaseAsync"/>, typically inside <c>try/finally</c>. The idle
/// timer is armed only when the in-use count drops back to zero.
/// </para>
/// <para>
/// An idle timeout of <see cref="TimeSpan.Zero"/> disables the unload timer —
/// the instance stays loaded until <see cref="DisposeAsync"/>.
/// </para>
/// </summary>
public sealed class IdleResourceCache<T> : IIdleResourceCache<T>
    where T : class, IDisposable
{
    private readonly Func<T> _factory;
    private readonly Func<TimeSpan> _idleTimeoutProvider;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly Timer _unloadTimer;

    private T? _current;
    private int _inUse;
    private bool _disposed;

    public IdleResourceCache(Func<T> factory, Func<TimeSpan> idleTimeoutProvider)
    {
        ArgumentNullException.ThrowIfNull(factory);
        ArgumentNullException.ThrowIfNull(idleTimeoutProvider);
        _factory = factory;
        _idleTimeoutProvider = idleTimeoutProvider;
        _unloadTimer = new Timer(OnTimerFired, state: null, Timeout.Infinite, Timeout.Infinite);
    }

    /// <summary>True when a live instance is currently cached in memory.</summary>
    public bool IsLoaded => Volatile.Read(ref _current) is not null;

    /// <summary>
    /// Snapshot accessor — lazily builds the resource on first call, touches
    /// the last-access clock, and returns the instance without pinning it
    /// against idle eviction. See <see cref="IIdleResourceCache{T}.GetAsync"/>.
    /// </summary>
    public async Task<T> GetAsync(CancellationToken ct)
    {
        var acquired = await AcquireAsync(ct).ConfigureAwait(false);
        await ReleaseAsync().ConfigureAwait(false);
        return acquired;
    }

    /// <summary>
    /// Returns the cached instance, creating it on demand. Increments an
    /// internal in-use counter and cancels any pending idle unload.
    /// </summary>
    public async Task<T> AcquireAsync(CancellationToken ct)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        await _gate.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            _unloadTimer.Change(Timeout.Infinite, Timeout.Infinite);
            _current ??= _factory();
            _inUse++;
            return _current;
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Decrements the in-use counter. When it reaches zero, schedules the
    /// cached instance for unload after the configured idle timeout.
    /// </summary>
    public async Task ReleaseAsync()
    {
        if (_disposed)
        {
            return;
        }
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            _inUse = Math.Max(0, _inUse - 1);
            if (_inUse == 0 && _current is not null)
            {
                var timeout = _idleTimeoutProvider();
                if (timeout > TimeSpan.Zero)
                {
                    _unloadTimer.Change(timeout, Timeout.InfiniteTimeSpan);
                }
            }
        }
        finally
        {
            _gate.Release();
        }
    }

    /// <summary>
    /// Disposes the cached instance if nothing is currently using it.
    /// Exposed so tests can trigger the same path the idle timer takes,
    /// without actually waiting for wall-clock minutes.
    /// </summary>
    public async Task<bool> UnloadIfIdleAsync()
    {
        if (_disposed)
        {
            return false;
        }
        await _gate.WaitAsync().ConfigureAwait(false);
        try
        {
            if (_inUse != 0 || _current is null)
            {
                return false;
            }
            _current.Dispose();
            _current = null;
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }
        _disposed = true;
        await _unloadTimer.DisposeAsync().ConfigureAwait(false);
        _current?.Dispose();
        _current = null;
        _gate.Dispose();
    }

    private void OnTimerFired(object? state) => _ = UnloadIfIdleAsync();
}
