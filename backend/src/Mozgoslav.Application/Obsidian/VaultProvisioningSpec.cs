using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// ADR-019 §5.2 — authoritative list of every file the driver is allowed to
public sealed record VaultProvisioningSpec(
    string VaultRoot,
    IReadOnlyList<BootstrapFileSpec> Files);
