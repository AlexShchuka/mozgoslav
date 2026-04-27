namespace Mozgoslav.Application.Obsidian;

public sealed record VaultSidecarApplyResult(
    VaultDiagnosticsReport Diagnostics,
    VaultProvisioningReceipt Receipt);
