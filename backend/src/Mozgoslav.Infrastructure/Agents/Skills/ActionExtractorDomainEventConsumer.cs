using System;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Agents.Skills;

public sealed class ActionExtractorDomainEventConsumer : BackgroundService
{
    private readonly IDomainEventBus _bus;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ActionExtractorDomainEventConsumer> _logger;

    public ActionExtractorDomainEventConsumer(
        IDomainEventBus bus,
        IServiceScopeFactory scopes,
        ILogger<ActionExtractorDomainEventConsumer> logger)
    {
        _bus = bus;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var evt in _bus.SubscribeAsync<ProcessedNoteSaved>(stoppingToken))
            {
                await HandleAsync(evt, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task HandleAsync(ProcessedNoteSaved evt, CancellationToken ct)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
            if (!settings.ActionsSkillEnabled)
            {
                return;
            }

            var skill = scope.ServiceProvider.GetRequiredService<IActionExtractorSkill>();
            await skill.ExtractAsync(evt.NoteId, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ActionExtractor consumer failed for note {NoteId}", evt.NoteId);
        }
    }
}
