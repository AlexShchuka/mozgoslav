using System.Runtime.InteropServices;

namespace Mozgoslav.Infrastructure.Platform;

/// <summary>
/// Resolves platform-specific app-data paths. On macOS we follow the Apple HIG
/// (<c>~/Library/Application Support/Mozgoslav/</c>); on Linux/Windows we fall
/// back to platform-appropriate locations so that the backend still boots in
/// dev containers and CI.
/// </summary>
public static class AppPaths
{
    public const string AppName = "Mozgoslav";

    public static string Root => Path.Combine(AppDataRoot(), AppName);
    public static string Models => Path.Combine(Root, "models");
    public static string Database => Path.Combine(Root, "mozgoslav.db");
    public static string Logs => Path.Combine(Root, "logs");
    public static string Temp => Path.Combine(Root, "temp");

    // ADR-003 D6: Syncthing-managed data roots. Created by SyncthingFolderInitializer
    // on first boot and referenced by the generated Syncthing config.xml.
    public static string Data => Path.Combine(Root, "data");
    public static string Recordings => Path.Combine(Data, "recordings");
    public static string Notes => Path.Combine(Data, "notes");
    public static string SyncthingHome => Path.Combine(Root, "syncthing");

    // ADR-007 BC-034 / bug 2 — filename MUST match the default ModelCatalog
    // entry (Whisper Russian antony66 ggml). Previously the seed pointed at
    // ``ggml-large-v3-q8_0.bin`` while the catalogue served
    // ``ggml-model-q8_0.bin`` — downloaded file and configured path never
    // agreed, breaking transcription on first run.
    public static string DefaultWhisperModelPath =>
        Path.Combine(Models, "ggml-model-q8_0.bin");

    public static string DefaultVadModelPath =>
        Path.Combine(Models, "ggml-silero-v6.2.0.bin");

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
