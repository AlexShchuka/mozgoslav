using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed class HotkeyEventsBridge : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ITopicEventSender _sender;
    private readonly ILogger<HotkeyEventsBridge> _logger;

    public HotkeyEventsBridge(
        IServiceProvider services,
        ITopicEventSender sender,
        ILogger<HotkeyEventsBridge> logger)
    {
        _services = services;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<IHotkeyEventNotifier>();

        try
        {
            await foreach (var payload in notifier.SubscribeAsync(stoppingToken))
            {
                var evt = new HotkeyEventMessage(payload.Kind, payload.Accelerator, payload.ObservedAt);
                try
                {
                    await _sender.SendAsync(DictationTopics.HotkeyEvents, evt, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Failed to forward hotkey event");
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
    }
}
