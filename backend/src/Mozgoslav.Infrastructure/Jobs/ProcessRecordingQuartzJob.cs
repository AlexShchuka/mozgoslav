using System;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.UseCases;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

/// <summary>
/// ADR-011 step 6 — the Quartz <see cref="IJob"/> that replaces
/// <c>QueueBackgroundService</c>'s custom polling loop. Each trigger fires
/// exactly once per queued <c>ProcessingJob</c> and delegates the actual
/// pipeline work to <see cref="ProcessQueueWorker"/>. Exceptions are swallowed
/// by the worker (marks the job <c>Failed</c>); this job never throws back into
/// Quartz unless the scheduler itself is shutting down.
/// <para>
/// The job is <see cref="DisallowConcurrentExecutionAttribute"/>-decorated so
/// Quartz serialises processing — the legacy queue ran one item at a time and
/// this preserves that behaviour. Scaling out to parallel workers is a
/// deliberate future change, not an accidental side-effect of the migration.
/// </para>
/// </summary>
[DisallowConcurrentExecution]
public sealed class ProcessRecordingQuartzJob : IJob
{
    public const string JobIdKey = "mozgoslav.jobId";
    public const string JobGroup = "mozgoslav.processing";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ProcessRecordingQuartzJob> _logger;

    public ProcessRecordingQuartzJob(
        IServiceScopeFactory scopeFactory,
        ILogger<ProcessRecordingQuartzJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        var data = context.MergedJobDataMap;
        if (!Guid.TryParse(data.GetString(JobIdKey), out var jobId))
        {
            _logger.LogError("ProcessRecordingQuartzJob fired without a valid '{Key}' entry", JobIdKey);
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var worker = scope.ServiceProvider.GetRequiredService<ProcessQueueWorker>();
        await worker.ProcessJobAsync(jobId, context.CancellationToken).ConfigureAwait(false);
    }
}
