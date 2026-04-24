using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Jobs;

public sealed class JobProgressBridge : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ITopicEventSender _sender;
    private readonly ILogger<JobProgressBridge> _logger;

    public JobProgressBridge(
        IServiceProvider services,
        ITopicEventSender sender,
        ILogger<JobProgressBridge> logger)
    {
        _services = services;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<IJobProgressNotifier>();

        try
        {
            await foreach (var job in notifier.SubscribeAsync(stoppingToken))
            {
                try
                {
                    await _sender.SendAsync(JobProgressTopics.AllJobs, job, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Failed to forward job progress for job {JobId}", job.Id);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
    }
}
