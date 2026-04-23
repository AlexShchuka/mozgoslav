using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.2 — authoritative list of every file the driver is allowed to
/// write inside the vault. Resolved from the embedded bootstrap manifest at
/// startup. The driver rejects writes outside this set.
/// </summary>
public sealed record VaultProvisioningSpec(
    string VaultRoot,
    IReadOnlyList<BootstrapFileSpec> Files);
