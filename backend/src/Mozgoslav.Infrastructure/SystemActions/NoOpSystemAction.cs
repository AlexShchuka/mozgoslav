using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.SystemActions;

public sealed class NoOpSystemAction : ISystemAction
{
    public Task<SystemActionResult> InvokeAsync(
        string shortcutName,
        IReadOnlyDictionary<string, string> args,
        CancellationToken ct)
    {
        return Task.FromResult(new SystemActionResult(
            Success: false,
            Output: null,
            Error: "System actions are not available on this platform."));
    }
}
