using System;
using System.IO;
using System.Runtime.InteropServices;

namespace Mozgoslav.Infrastructure.Platform;

public static class AppPaths
{
    public const string AppName = "Mozgoslav";

    public static string Root => Path.Combine(AppDataRoot(), AppName);
    public static string Models => Path.Combine(Root, "models");

    public static string BundleModelsDir
    {
        get
        {
            var env = Environment.GetEnvironmentVariable("MOZGOSLAV_BUNDLE_MODELS_DIR");
            if (!string.IsNullOrWhiteSpace(env) && Directory.Exists(env))
            {
                return env;
            }
            return string.Empty;
        }
    }
    public static string Database => Path.Combine(Root, "mozgoslav.db");
    public static string Logs => Path.Combine(Root, "logs");
    public static string Temp => Path.Combine(Root, "temp");

    public static string Data => Path.Combine(Root, "data");
    public static string Recordings => Path.Combine(Data, "recordings");
    public static string Notes => Path.Combine(Data, "notes");
    public static string SyncthingHome => Path.Combine(Root, "syncthing");

    public static string DefaultWhisperModelPath =>
        ResolveBundledOrUserModel("ggml-small-q8_0.bin", BundleModelsDir, Models);

    public static string DefaultVadModelPath =>
        ResolveBundledOrUserModel("ggml-silero-v6.2.0.bin", BundleModelsDir, Models);

    public static string ResolveBundledOrUserModel(string filename, string bundleDir, string userModelsDir)
    {
        if (!string.IsNullOrEmpty(bundleDir))
        {
            return Path.Combine(bundleDir, filename);
        }
        return Path.Combine(userModelsDir, filename);
    }

    public static string DefaultVaultPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Documents", "Obsidian Vault");

    public static void EnsureExist()
    {
        foreach (var path in new[] { Root, Models, Logs, Temp })
        {
            Directory.CreateDirectory(path);
        }
    }

    private static string AppDataRoot()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(home, "Library", "Application Support");
        }

        return Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    }
}
