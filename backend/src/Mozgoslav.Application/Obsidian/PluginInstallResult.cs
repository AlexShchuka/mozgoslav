using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

/// <summary>ADR-019 §5.8 — outcome of a plugin install / removal.</summary>
public sealed record PluginInstallResult(
    string PluginId,
    PluginInstallStatus Status,
    string? Message,
    IReadOnlyList<string> WrittenFiles);

/// <summary>Discrete states for <see cref="PluginInstallResult"/>.</summary>
public enum PluginInstallStatus
{
    Installed,
    AlreadyInstalled,
    Removed,
    NotInstalled,
    HashMismatch,
    DownloadFailed,
    WriteFailed,
}
