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

    /// <summary>
    /// Plan v0.8 Block 2 / ADR-010 §2.4 — Tier-1 bundle directory inside the
    /// Electron resources tree. Populated at build time by
    /// <c>scripts/fetch-bundle-models.sh</c>.
    /// <para>
    /// Resolution order:
    /// <list type="number">
    ///   <item><description>Env var <c>MOZGOSLAV_BUNDLE_MODELS_DIR</c> — set by
    ///   the Electron launcher from <c>process.resourcesPath</c>.</description></item>
    ///   <item><description>Repo-local <c>frontend/build/bundle-models</c> for
    ///   dev boxes that ran <c>npm run dist:mac</c> at least once.</description></item>
    ///   <item><description>Empty string when nothing is available; callers
    ///   gracefully fall back to the Tier-2 download path.</description></item>
    /// </list>
    /// </para>
    /// </summary>
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

    // ADR-003 D6: Syncthing-managed data roots. Created by SyncthingFolderInitializer
    // on first boot and referenced by the generated Syncthing config.xml.
    public static string Data => Path.Combine(Root, "data");
    public static string Recordings => Path.Combine(Data, "recordings");
    public static string Notes => Path.Combine(Data, "notes");
    public static string SyncthingHome => Path.Combine(Root, "syncthing");

    // Task #12 — first-run default points at the Tier 1 bundled Whisper Small
    // (ADR-010 §Tier 1). Resolution: if MOZGOSLAV_BUNDLE_MODELS_DIR is set and
    // the directory exists, serve the file from the DMG bundle; otherwise fall
    // back to the user's Models dir where Onboarding's "Скачать" flow drops it.
    // Previously pointed at ``ggml-model-q8_0.bin`` (Tier 2 antony66) which
    // required a 1.5 GB download before the app could transcribe anything.
    public static string DefaultWhisperModelPath =>
        ResolveBundledOrUserModel("ggml-small-q8_0.bin", BundleModelsDir, Models);

    public static string DefaultVadModelPath =>
        ResolveBundledOrUserModel("ggml-silero-v6.2.0.bin", BundleModelsDir, Models);

    /// <summary>
    /// Pure resolver — tests pass explicit <paramref name="bundleDir"/> and
    /// <paramref name="userModelsDir"/> so they don't have to mutate the
    /// shared <c>MOZGOSLAV_BUNDLE_MODELS_DIR</c> env var (which would break
    /// parallel test execution).
    /// </summary>
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
