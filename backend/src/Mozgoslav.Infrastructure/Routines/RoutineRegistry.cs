using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Routines;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Routines;

public sealed class RoutineRegistry : IRoutineRegistry
{
    private const string ActionExtractorKey = "action-extractor";
    private const string RemindersKey = "reminders";

    private readonly IAppSettings _settings;
    private readonly IRoutineRunRepository _runRepository;
    private readonly IRemindersSkill _remindersSkill;
    private readonly ILogger<RoutineRegistry> _logger;

    public RoutineRegistry(
        IAppSettings settings,
        IRoutineRunRepository runRepository,
        IActionExtractorSkill actionExtractorSkill,
        IRemindersSkill remindersSkill,
        ILogger<RoutineRegistry> logger)
    {
        _ = actionExtractorSkill;
        _settings = settings;
        _runRepository = runRepository;
        _remindersSkill = remindersSkill;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RoutineDefinition>> ListAsync(CancellationToken ct)
    {
        var actionExtractorLastRun = await _runRepository.TryGetLatestAsync(ActionExtractorKey, ct);
        var remindersLastRun = await _runRepository.TryGetLatestAsync(RemindersKey, ct);

        return
        [
            new RoutineDefinition(
                Key: ActionExtractorKey,
                DisplayName: "Action Extractor",
                Description: "Extracts action items from processed notes and writes them to the vault",
                IsEnabled: _settings.ActionsSkillEnabled,
                LastRun: actionExtractorLastRun),
            new RoutineDefinition(
                Key: RemindersKey,
                DisplayName: "Reminders",
                Description: "Creates reminders from extracted action items via Apple Shortcuts",
                IsEnabled: _settings.RemindersSkillEnabled,
                LastRun: remindersLastRun),
        ];
    }

    public async Task<RoutineRun> RunNowAsync(string key, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        var run = new RoutineRun
        {
            RoutineKey = key,
            StartedAt = DateTimeOffset.UtcNow,
            Status = "Running",
        };

        await _runRepository.AddAsync(run, ct);

        try
        {
            if (key == ActionExtractorKey)
            {
                _logger.LogInformation("RoutineRegistry: RunNow triggered for action-extractor (manual)");
                run.Status = "Succeeded";
                run.PayloadSummary = "Manual run triggered";
            }
            else if (key == RemindersKey)
            {
                await _remindersSkill.CreateAsync([], ct);
                run.Status = "Succeeded";
                run.PayloadSummary = "Manual run triggered";
            }
            else
            {
                run.Status = "Failed";
                run.ErrorMessage = $"Unknown routine key: {key}";
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            run.Status = "Failed";
            run.ErrorMessage = ex.Message;
            _logger.LogWarning(ex, "RoutineRegistry: RunNow failed for key {Key}", key);
        }
        finally
        {
            run.FinishedAt = DateTimeOffset.UtcNow;
            await _runRepository.UpdateAsync(run, ct);
        }

        return run;
    }

    public async Task ToggleAsync(string key, bool enabled, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);

        var dto = _settings.Snapshot;

        dto = key switch
        {
            ActionExtractorKey => dto with { ActionsSkillEnabled = enabled },
            RemindersKey => dto with { RemindersSkillEnabled = enabled },
            _ => throw new InvalidOperationException($"Unknown routine key: {key}"),
        };

        await _settings.SaveAsync(dto, ct);
    }
}
