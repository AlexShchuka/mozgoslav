using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.9 — embedded-resource reader. Exposes the shipped bootstrap
/// tree + its hash manifest to the rest of the app. Implementations MUST
/// return the same byte stream across multiple reads of the same key.
/// </summary>
public interface IVaultBootstrapProvider
{
    IReadOnlyList<BootstrapManifestEntry> Manifest { get; }

    Task<Stream> OpenReadAsync(string embeddedResourceKey, CancellationToken ct);
}
