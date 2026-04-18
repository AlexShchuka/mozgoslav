namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-015 — process-wide registry of per-job <see cref="CancellationTokenSource"/>
/// instances for jobs currently being processed by the queue worker. The cancel
/// endpoint flips the stored CTS so the active pipeline stage observes cancellation
/// cooperatively (via the token it was handed). Registration and unregistration
/// happen inside the worker's try/finally around a single job; outside that
/// window the job id is absent from the registry and <see cref="TryCancel"/> is a no-op.
/// </summary>
public interface IJobCancellationRegistry
{
    /// <summary>
    /// Register a new per-job CTS linked with the host <paramref name="hostToken"/>.
    /// The returned CTS is owned by the registry; call <see cref="Unregister"/>
    /// in a <c>finally</c> to dispose it.
    /// </summary>
    CancellationTokenSource Register(Guid jobId, CancellationToken hostToken);

    /// <summary>
    /// Dispose + remove the per-job CTS for <paramref name="jobId"/>. No-op if
    /// the id is not present (e.g. worker already unregistered).
    /// </summary>
    void Unregister(Guid jobId);

    /// <summary>
    /// Signal the registered CTS. Returns <c>true</c> if a CTS was found and
    /// cancelled; <c>false</c> if the job is not currently active.
    /// </summary>
    bool TryCancel(Guid jobId);
}
