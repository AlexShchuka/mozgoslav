using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Agents.Skills;

public sealed class RemindersSkill : IRemindersSkill
{
    private const string AddReminderShortcutName = "Mozgoslav: Add reminder";

    private readonly ISystemAction _systemAction;
    private readonly ILogger<RemindersSkill> _logger;

    public RemindersSkill(ISystemAction systemAction, ILogger<RemindersSkill> logger)
    {
        _systemAction = systemAction;
        _logger = logger;
    }

    public async Task CreateAsync(IReadOnlyList<ActionItem> items, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(items);

        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Title))
            {
                continue;
            }

            var args = new Dictionary<string, string>
            {
                ["title"] = item.Title,
                ["due"] = item.DueIso ?? string.Empty,
            };

            try
            {
                var result = await _systemAction.InvokeAsync(AddReminderShortcutName, args, ct);
                if (!result.Success)
                {
                    _logger.LogWarning(
                        "Reminder creation failed for '{Title}': {Error}",
                        item.Title, result.Error);
                }
                else
                {
                    _logger.LogInformation("Created reminder: '{Title}'", item.Title);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "RemindersSkill: shortcut invocation failed for '{Title}'", item.Title);
            }
        }
    }
}
