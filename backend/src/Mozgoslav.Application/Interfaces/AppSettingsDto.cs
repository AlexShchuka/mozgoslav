namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Snapshot of all persisted application settings. Immutable — updates are produced
/// via record <c>with</c> expressions and then persisted through
/// <see cref="IAppSettings.SaveAsync"/>.
/// </summary>
public sealed record AppSettingsDto(
    string VaultPath,
    string LlmEndpoint,
    string LlmModel,
    string LlmApiKey,
    string ObsidianApiHost,
    string ObsidianApiToken,
    string WhisperModelPath,
    string VadModelPath,
    string Language,
    string ThemeMode,
    int WhisperThreads,
    bool DictationEnabled,
    string DictationHotkeyType,
    int DictationMouseButton,
    string DictationKeyboardHotkey,
    string DictationLanguage,
    string DictationWhisperModelId,
    int DictationCaptureSampleRate,
    bool DictationLlmPolish,
    string DictationInjectMode,
    bool DictationOverlayEnabled,
    string DictationOverlayPosition,
    bool DictationSoundFeedback,
    IReadOnlyList<string> DictationVocabulary,
    // ADR-004 R4 — Whisper idle unload timer (minutes).
    int DictationModelUnloadMinutes,
    // ADR-004 R5 — override path for the temp PCM ring-file directory; empty = use platform default.
    string DictationTempAudioPath,
    // ADR-004 R2 — per-application correction profile overrides. Key: macOS bundle id (or hostname for web apps);
    // value: profile id from <c>IProfileRepository</c>. Missing key ⇒ default profile.
    IReadOnlyDictionary<string, string> DictationAppProfiles,
    // ADR-003 — top-level enable flag for the bundled Syncthing process.
    bool SyncthingEnabled,
    // ADR-003 D4 — absolute path to the user's Obsidian vault; empty = vault not synced.
    string SyncthingObsidianVaultPath)
{
    public static AppSettingsDto Defaults { get; } = new(
        VaultPath: string.Empty,
        LlmEndpoint: "http://localhost:1234",
        LlmModel: "default",
        LlmApiKey: string.Empty,
        ObsidianApiHost: "http://127.0.0.1:27123",
        ObsidianApiToken: string.Empty,
        WhisperModelPath: string.Empty,
        VadModelPath: string.Empty,
        Language: "ru",
        ThemeMode: "system",
        WhisperThreads: 0,
        DictationEnabled: true,
        DictationHotkeyType: "mouse",
        DictationMouseButton: 5,
        DictationKeyboardHotkey: "Right-Option",
        DictationLanguage: "ru",
        DictationWhisperModelId: "whisper-large-v3-russian-antony66",
        DictationCaptureSampleRate: 48000,
        DictationLlmPolish: false,
        DictationInjectMode: "auto",
        DictationOverlayEnabled: true,
        DictationOverlayPosition: "cursor",
        DictationSoundFeedback: true,
        DictationVocabulary: [],
        DictationModelUnloadMinutes: 10,
        DictationTempAudioPath: string.Empty,
        DictationAppProfiles: new Dictionary<string, string>
        {
            // ADR-004 R2 seeds — UI to edit later lands in a separate ADR.
            ["com.microsoft.VSCode"] = "code-profile",
            ["com.google.Chrome"] = "default",
            ["slack.com"] = "informal-profile",
        },
        SyncthingEnabled: true,
        SyncthingObsidianVaultPath: string.Empty);
}
