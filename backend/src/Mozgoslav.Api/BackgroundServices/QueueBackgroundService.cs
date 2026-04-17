using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.BackgroundServices;

/// <summary>
/// Hosted service that continuously drains the processing queue. Each iteration
/// pulls one job via <see cref="ProcessQueueWorker.ProcessNextAsync"/>; when the
/// queue is empty the loop sleeps briefly so we don't hot-spin on SQLite.
/// </summary>
public sealed class QueueBackgroundService : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(2);

    // ADR-007 BC-016 / bug 20 — jobs left in an in-flight state when the host
    // process died (SIGKILL, crash, user-quit mid-step) must be visible to the
    // user on the next boot. We flip them back to Queued so the background
    // loop can pick them up from scratch; `ErrorMessage` preserves the reason
    // for the UI badge.
    private static readonly JobStatus[] InFlightStatuses =
    [
        JobStatus.Transcribing,
        JobStatus.Correcting,
        JobStatus.Summarizing,
        JobStatus.Exporting,
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QueueBackgroundService> _logger;

    public QueueBackgroundService(IServiceScopeFactory scopeFactory, ILogger<QueueBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await ReconcileStuckJobsAsync(cancellationToken);
        await base.StartAsync(cancellationToken);
    }

    /// <summary>
    /// Static testable seam — flip every non-terminal in-flight job back to
    /// <see cref="JobStatus.Queued"/> with a user-facing reason string.
    /// Extracted so <c>QueueStartupReconciliationTests</c> can assert against
    /// it without racing the background worker loop.
    /// </summary>
    public static async Task<int> ReconcileAsync(IProcessingJobRepository repo, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(repo);
        var requeued = 0;
        foreach (var status in InFlightStatuses)
        {
            var stuck = await repo.GetByStatusAsync(status, ct);
            foreach (var job in stuck)
            {
                job.Status = JobStatus.Queued;
                job.Progress = 0;
                job.CurrentStep = null;
                job.ErrorMessage = "app restarted — auto-requeued";
                job.StartedAt = null;
                await repo.UpdateAsync(job, ct);
                requeued++;
            }
        }
        return requeued;
    }

    private async Task ReconcileStuckJobsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();

        var requeued = await ReconcileAsync(repo, ct);
        if (requeued > 0)
        {
            _logger.LogInformation("Startup reconciliation: requeued {Count} jobs", requeued);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Queue background service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            bool processed;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var worker = scope.ServiceProvider.GetRequiredService<ProcessQueueWorker>();
                processed = await worker.ProcessNextAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Queue iteration failed");
                processed = false;
            }

            if (!processed)
            {
                await Task.Delay(IdleDelay, stoppingToken);
            }
        }

        _logger.LogInformation("Queue background service stopped");
    }
}
