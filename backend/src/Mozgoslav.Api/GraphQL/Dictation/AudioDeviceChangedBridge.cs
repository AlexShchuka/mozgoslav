using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed class AudioDeviceChangedBridge : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ITopicEventSender _sender;
    private readonly ILogger<AudioDeviceChangedBridge> _logger;

    public AudioDeviceChangedBridge(
        IServiceProvider services,
        ITopicEventSender sender,
        ILogger<AudioDeviceChangedBridge> logger)
    {
        _services = services;
        _sender = sender;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var scope = _services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<IAudioDeviceChangeNotifier>();

        try
        {
            await foreach (var payload in notifier.SubscribeAsync(stoppingToken))
            {
                var evt = new AudioDeviceChangedEvent(
                    payload.Kind,
                    payload.Devices.Select(d => new AudioDeviceEntry(d.Id, d.Name, d.IsDefault)).ToArray(),
                    payload.ObservedAt);
                try
                {
                    await _sender.SendAsync(DictationTopics.AudioDeviceChanged, evt, stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "Failed to forward audio device change event");
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
    }
}
