using System;
using System.Collections.Generic;
using System.Linq;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.3 — single aggregated diagnostics payload. Only source of truth
/// for "is Obsidian connected" across the backend + frontend.
/// </summary>
public sealed record VaultDiagnosticsReport(
    Guid SnapshotId,
    VaultPathCheck Vault,
    IReadOnlyList<PluginCheck> Plugins,
    TemplaterSettingsCheck Templater,
    BootstrapDriftCheck Bootstrap,
    RestApiCheck RestApi,
    LmStudioCheck LmStudio,
    DateTimeOffset GeneratedAt)
{
    public bool IsHealthy => Vault.Ok
        && Plugins.All(p => p.Ok || p.Optional)
        && Templater.Ok
        && Bootstrap.Ok
        && (!RestApi.Required || RestApi.Ok);
}
