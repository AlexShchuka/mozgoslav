using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Infrastructure.Jobs;

/// <summary>
/// ADR-011 step 6 — startup gate that replaces the legacy
/// <c>QueueBackgroundService.ReconcileAsync</c> mechanism. On boot, every
/// <see cref="ProcessingJob"/> row that is still in a non-terminal state is
/// either
/// (a) left as <see cref="JobStatus.Queued"/> and handed to Quartz as a fresh
///     trigger, or
/// (b) flipped from an in-flight state (<c>Transcribing</c>,
///     <c>Correcting</c>, <c>Summarizing</c>, <c>Exporting</c>) back to
///     <c>Queued</c> with <c>auto-requeued</c> error text, then handed to
///     Quartz.
/// <para>
/// Runs after <see cref="Mozgoslav.Infrastructure.Seed.DatabaseInitializer"/>
/// (migrations + settings) so the schema is already in place, and after the
/// Quartz hosted service so the scheduler is live. The host registration order
/// guarantees that sequence.
/// </para>
/// </summary>
public sealed class ProcessingJobRehydrator : IHostedService
{
    private static readonly JobStatus[] InFlightStatuses =
    [
        JobStatus.Transcribing,
        JobStatus.Correcting,
        JobStatus.Summarizing,
        JobStatus.Exporting,
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProcessingJobRehydrator> _logger;

    public ProcessingJobRehydrator(
        IServiceScopeFactory scopeFactory,
        ILogger<ProcessingJobRehydrator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProcessingJobRepository>();
        var scheduler = scope.ServiceProvider.GetRequiredService<IProcessingJobScheduler>();

        var requeued = 0;
        foreach (var status in InFlightStatuses)
        {
            var stuck = await repo.GetByStatusAsync(status, cancellationToken).ConfigureAwait(false);
            foreach (var job in stuck)
            {
                job.Status = JobStatus.Queued;
                job.Progress = 0;
                job.CurrentStep = null;
                job.ErrorMessage = "app restarted — auto-requeued";
                job.StartedAt = null;
                await repo.UpdateAsync(job, cancellationToken).ConfigureAwait(false);
                requeued++;
            }
        }
        if (requeued > 0)
        {
            _logger.LogInformation("Rehydrator: flipped {Count} in-flight jobs back to Queued", requeued);
        }

        var queued = await repo.GetByStatusAsync(JobStatus.Queued, cancellationToken).ConfigureAwait(false);
        foreach (var job in queued)
        {
            await scheduler.ScheduleAsync(job.Id, cancellationToken).ConfigureAwait(false);
        }
        if (queued.Count > 0)
        {
            _logger.LogInformation("Rehydrator: scheduled {Count} queued jobs into Quartz", queued.Count);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
