using Mozgoslav.Application.UseCases;

namespace Mozgoslav.Api.BackgroundServices;

/// <summary>
/// Hosted service that continuously drains the processing queue. Each iteration
/// pulls one job via <see cref="ProcessQueueWorker.ProcessNextAsync"/>; when the
/// queue is empty the loop sleeps briefly so we don't hot-spin on SQLite.
/// </summary>
public sealed class QueueBackgroundService : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QueueBackgroundService> _logger;

    public QueueBackgroundService(IServiceScopeFactory scopeFactory, ILogger<QueueBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
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
