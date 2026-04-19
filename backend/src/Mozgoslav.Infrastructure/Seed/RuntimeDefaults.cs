using System;
using System.IO;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Seed;

/// <summary>
/// First-run defaults applied on top of a freshly-loaded <see cref="AppSettingsDto"/>.
/// Fills in Whisper/VAD model paths and — task #12 — the Obsidian vault path when
/// it is empty and the conventional <c>~/Documents/Obsidian Vault</c> actually
/// exists on disk. Extracted from <c>DatabaseInitializer</c> so it can be unit-
/// tested without booting the host.
/// </summary>
public static class RuntimeDefaults
{
    public static AppSettingsDto Apply(AppSettingsDto current) =>
        Apply(current, Directory.Exists);

    /// <summary>
    /// Pure-function overload: caller injects the filesystem probe so tests
    /// stay hermetic and parallelisable (no shared filesystem state).
    /// </summary>
    public static AppSettingsDto Apply(AppSettingsDto current, Func<string, bool> directoryExists)
    {
        ArgumentNullException.ThrowIfNull(current);
        ArgumentNullException.ThrowIfNull(directoryExists);

        return current with
        {
            WhisperModelPath = string.IsNullOrWhiteSpace(current.WhisperModelPath)
                ? AppPaths.DefaultWhisperModelPath
                : current.WhisperModelPath,
            VadModelPath = string.IsNullOrWhiteSpace(current.VadModelPath)
                ? AppPaths.DefaultVadModelPath
                : current.VadModelPath,
            VaultPath = ResolveVault(current.VaultPath, directoryExists),
        };
    }

    private static string ResolveVault(string current, Func<string, bool> directoryExists)
    {
        if (!string.IsNullOrWhiteSpace(current))
        {
            return current;
        }

        var candidate = AppPaths.DefaultVaultPath;
        return directoryExists(candidate) ? candidate : string.Empty;
    }
}
