using System;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.UseCases;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

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
