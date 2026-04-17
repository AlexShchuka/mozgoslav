using System.Collections.Concurrent;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Application.Services;

/// <summary>
/// ADR-015 — default in-process implementation of <see cref="IJobCancellationRegistry"/>.
/// Registered as a singleton so the cancel endpoint and the background queue
/// worker share the same map of active jobs.
/// </summary>
public sealed class JobCancellationRegistry : IJobCancellationRegistry
{
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _map = new();

    // IDISP015 — returning a cached disposable is intentional. The ownership
    // contract is explicit: the caller is the queue worker, which pairs every
    // Register() with Unregister() in a finally block; Unregister performs
    // the dispose.
    // IDISP017 — the only Dispose() inside Register is the duplicate-guard
    // branch, where TryAdd failed and the freshly-made CTS must be released.
    // A `using` block is not applicable here because in the happy branch the
    // CTS is transferred to the dictionary.
#pragma warning disable IDISP015, IDISP017
    public CancellationTokenSource Register(Guid jobId, CancellationToken hostToken)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(hostToken);
        if (_map.TryAdd(jobId, cts))
        {
            return cts;
        }
        cts.Dispose();
        return _map[jobId];
    }
#pragma warning restore IDISP015, IDISP017

    // IDISP017 — we intentionally don't wrap the removed CTS in a `using`
    // because it is not created here; Register() stored it and Unregister()
    // ends its lifecycle. Explicit Dispose() is the correct shape.
#pragma warning disable IDISP017
    public void Unregister(Guid jobId)
    {
        if (_map.TryRemove(jobId, out var cts))
        {
            cts.Dispose();
        }
    }
#pragma warning restore IDISP017

    public bool TryCancel(Guid jobId)
    {
        if (!_map.TryGetValue(jobId, out var cts))
        {
            return false;
        }
        if (cts.IsCancellationRequested)
        {
            return true;
        }
        cts.Cancel();
        return true;
    }
}
