namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-004 R4 / ADR-007-phase2-backend §2.4 — thin port over a lazy-loaded
/// heavyweight resource (today: <c>Whisper.net.WhisperFactory</c>) that must
/// be kept warm between calls but freed after an idle window to reclaim RAM.
///
/// <para>
/// Two usage shapes are exposed:
/// <list type="bullet">
///   <item>
///   <c>GetAsync</c> — "snapshot" access: lazily builds the instance on first
///   call, touches the last-access clock, and returns the instance without
///   pinning it. Suitable for short one-shot calls that don't hold the
///   resource across their own I/O.
///   </item>
///   <item>
///   <c>AcquireAsync</c>/<c>ReleaseAsync</c> — scoped access: pins the
///   resource against idle eviction for the duration between the two calls.
///   Required by long streams (<c>TranscribeStreamAsync</c>) that must keep
///   the same <c>WhisperFactory</c> alive for the whole session even when an
///   idle tick fires in the middle.
///   </item>
/// </list>
/// Both shapes share the same single-slot cache — concurrent callers mixing
/// the two never build more than one instance.
/// </para>
/// </summary>
/// <typeparam name="T">
/// Cached resource type. The cache implementation may require stricter
/// constraints (e.g. <c>IDisposable</c>) so it can release the instance
/// when the idle timer fires.
/// </typeparam>
public interface IIdleResourceCache<T> : IAsyncDisposable
    where T : class
{
    /// <summary>
    /// Returns the cached instance, building it on demand. Resets the idle
    /// clock but does NOT pin the instance — callers that need to hold the
    /// instance across asynchronous boundaries should use
    /// <see cref="AcquireAsync"/>/<see cref="ReleaseAsync"/> instead.
    /// </summary>
    Task<T> GetAsync(CancellationToken ct);

    /// <summary>
    /// Returns the cached instance and increments an internal in-use counter
    /// so the idle timer does not tear it down while the caller is still
    /// working with it. Every <see cref="AcquireAsync"/> must be paired with
    /// exactly one <see cref="ReleaseAsync"/>, typically in <c>try/finally</c>.
    /// </summary>
    Task<T> AcquireAsync(CancellationToken ct);

    /// <summary>Decrements the in-use counter and (if zero) arms the idle timer.</summary>
    Task ReleaseAsync();
}
