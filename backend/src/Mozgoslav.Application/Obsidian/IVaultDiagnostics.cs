using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public interface IVaultDiagnostics
{
    Task<VaultDiagnosticsReport> RunAsync(CancellationToken ct);
}
