using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.3 / G3 — sole connection-check port. Runs all diagnostics in
/// one pass with shared per-call timeouts; never throws for probe failures;
/// returns <see cref="VaultDiagnosticsReport"/> with severity-tagged chips.
/// </summary>
public interface IVaultDiagnostics
{
    Task<VaultDiagnosticsReport> RunAsync(CancellationToken ct);
}
