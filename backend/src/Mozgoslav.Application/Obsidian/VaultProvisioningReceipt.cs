using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record VaultProvisioningReceipt(
    string? BackedUpTo,
    IReadOnlyList<string> Overwritten,
    IReadOnlyList<string> Skipped);
