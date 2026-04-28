using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface INativeHelperClient
{
    Task<SystemActionResult> RunShortcutAsync(
        string name,
        string input,
        CancellationToken ct);
}
