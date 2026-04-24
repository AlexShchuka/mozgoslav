using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Obsidian;

public interface IVaultBootstrapProvider
{
    IReadOnlyList<BootstrapManifestEntry> Manifest { get; }

    Task<Stream> OpenReadAsync(string embeddedResourceKey, CancellationToken ct);
}
