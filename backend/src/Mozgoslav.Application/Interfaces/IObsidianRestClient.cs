using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Plan v0.8 Block 6 — thin wrapper over the Obsidian Local REST API plugin.
/// Every method degrades gracefully: <see cref="IsReachableAsync"/> never
/// throws, and consumer code calls it first to decide between the REST path
/// and the file-I/O fallback described in the plan §2.2.
/// </summary>
public interface IObsidianRestClient
{
    /// <summary>
    /// Fast non-throwing health probe. Returns <c>true</c> when the plugin
    /// responds with a 200 on <c>GET /</c> (default: <c>https://127.0.0.1:27124</c>)
    /// inside <see cref="TimeSpan"/> ≈ 500 ms.
    /// </summary>
    Task<bool> IsReachableAsync(CancellationToken ct);

    /// <summary>Opens a vault-relative note in the running Obsidian instance.</summary>
    Task OpenNoteAsync(string vaultRelativePath, CancellationToken ct);

    /// <summary>Returns vault metadata (name / path / plugin version).</summary>
    Task<ObsidianVaultInfo> GetVaultInfoAsync(CancellationToken ct);

    /// <summary>Idempotently ensures a folder exists inside the vault.</summary>
    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
}

/// <summary>Minimal vault metadata surfaced through the client.</summary>
public sealed record ObsidianVaultInfo(string Name, string Path, string Version);
