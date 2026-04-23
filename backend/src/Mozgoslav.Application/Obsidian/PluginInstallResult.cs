using System.Collections.Generic;

namespace Mozgoslav.Application.Obsidian;

public sealed record PluginInstallResult(
    string PluginId,
    PluginInstallStatus Status,
    string? Message,
    IReadOnlyList<string> WrittenFiles);

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
