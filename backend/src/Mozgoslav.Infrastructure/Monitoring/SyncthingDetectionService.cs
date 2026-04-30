using System;
using System.IO;

using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Infrastructure.Monitoring;

public sealed class SyncthingDetectionService
{
    public SyncthingRuntimeState Detect()
    {
        var binaryPath = ResolveBinaryPath();

        if (binaryPath is null)
        {
            return new SyncthingRuntimeState(
                Detection: "not-installed",
                BinaryPath: null,
                ApiUrl: null,
                Version: null,
                Hint: "Install Syncthing or set MOZGOSLAV_SYNCTHING_BINARY to the executable path.");
        }

        return new SyncthingRuntimeState(
            Detection: "installed-not-running",
            BinaryPath: binaryPath,
            ApiUrl: null,
            Version: null,
            Hint: "Syncthing binary found. Start Syncthing or enable it in Settings → Sync.");
    }

    private static string? ResolveBinaryPath()
    {
        var envVar = Environment.GetEnvironmentVariable("MOZGOSLAV_SYNCTHING_BINARY");
        if (!string.IsNullOrWhiteSpace(envVar) && File.Exists(envVar))
        {
            return envVar;
        }

        var legacyEnvVar = Environment.GetEnvironmentVariable("SYNCTHING_BINARY");
        if (!string.IsNullOrWhiteSpace(legacyEnvVar) && File.Exists(legacyEnvVar))
        {
            return legacyEnvVar;
        }

        return FindOnPath("syncthing");
    }

    private static string? FindOnPath(string exe)
    {
        var path = Environment.GetEnvironmentVariable("PATH");
        if (string.IsNullOrEmpty(path))
        {
            return null;
        }

        foreach (var dir in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = Path.Combine(dir, exe);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }
}
