using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Platform;

public sealed class NoOpNativeHelperClient : INativeHelperClient
{
    public Task<SystemActionResult> RunShortcutAsync(
        string name,
        string input,
        CancellationToken ct)
    {
        return Task.FromResult(new SystemActionResult(
            Success: false,
            Output: null,
            Error: "Native helper is not available on this platform."));
    }
}
