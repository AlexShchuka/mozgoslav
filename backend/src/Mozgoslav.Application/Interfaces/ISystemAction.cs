using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface ISystemAction
{
    Task<SystemActionResult> InvokeAsync(
        string shortcutName,
        IReadOnlyDictionary<string, string> args,
        CancellationToken ct);
}
