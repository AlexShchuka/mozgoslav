using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Sync;

public sealed class SyncEventsBridge : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ITopicEventSender _sender;
    private readonly ILogger<SyncEventsBridge> _logger;

    public SyncEventsBridge(
        IServiceProvider services,
        ITopicEventSender sender,
        ILogger<SyncEventsBridge> logger)
    {
        _services = services;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var client = scope.ServiceProvider.GetRequiredService<ISyncthingClient>();

        try
        {
            await foreach (var evt in client.StreamEventsAsync(stoppingToken))
            {
                var msg = new SyncEventMessage(
                    evt.Id,
                    evt.Type,
                    evt.Time,
                    evt.FolderCompletion,
                    evt.DeviceConnection,
                    evt.PendingDevices,
                    evt.FileConflict);
                try
                {
                    await _sender.SendAsync(SyncTopics.AllEvents, msg, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Failed to forward sync event {EventType}", evt.Type);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Sync event streaming terminated");
        }
    }
}
