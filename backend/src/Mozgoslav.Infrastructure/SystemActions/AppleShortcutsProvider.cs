using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.SystemActions;

public sealed class AppleShortcutsProvider : ISystemAction
{
    private readonly INativeHelperClient _helper;
    private readonly ILogger<AppleShortcutsProvider> _logger;

    public AppleShortcutsProvider(
        INativeHelperClient helper,
        ILogger<AppleShortcutsProvider> logger)
    {
        _helper = helper;
        _logger = logger;
    }

    public async Task<SystemActionResult> InvokeAsync(
        string shortcutName,
        IReadOnlyDictionary<string, string> args,
        CancellationToken ct)
    {
        var input = args.TryGetValue("input", out var v) ? v : string.Empty;

        _logger.LogInformation(
            "InvokeAsync shortcut={ShortcutName} inputLength={InputLength}",
            shortcutName,
            input.Length);

        var result = await _helper.RunShortcutAsync(shortcutName, input, ct);

        if (!result.Success)
        {
            _logger.LogWarning(
                "Shortcut {ShortcutName} failed: {Error}",
                shortcutName,
                result.Error);
        }

        return result;
    }
}
