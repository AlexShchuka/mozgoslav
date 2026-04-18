namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Snapshot of all persisted application settings. Immutable — updates are produced
/// via record <c>with</c> expressions and then persisted through
/// <see cref="IAppSettings.SaveAsync"/>.
/// </summary>
public sealed record AppSettingsDto(
    string VaultPath,
    // BC-036 discriminator for <see cref="ILlmProviderFactory"/>.
    // "openai_compatible" (LM Studio / Ollama OpenAI adapter), "anthropic"
    // (Claude Messages API) or "ollama" (native /api/chat). Unknown values
    // fall back to "openai_compatible" with a WARN log.
    string LlmProvider,
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
    string SyncthingObsidianVaultPath,
    // ADR-007-shared §2.8 / Migration 0010 — Syncthing REST api key, persisted so the
    // Electron host can resume against the same instance after a backend restart.
    // Empty = api key not yet generated (first run or clean wipe).
    string SyncthingApiKey,
    // ADR-007-shared §2.8 / Migration 0010 — Syncthing REST base URL, persisted so the
    // SyncthingHttpClient wires against the freshly-spawned instance without restart.
    // Empty = base URL not yet determined (binary-absent branch).
    string SyncthingBaseUrl,
    // Task #10 follow-up (NEXT H1) — when true, the dictation hotkey acts
    // as push-to-talk (hold to record, release to stop) instead of toggle.
    // Requires the native Swift helper to publish keyUp events; on non-macOS
    // platforms the flag is read but has no runtime effect.
    bool DictationPushToTalk = false)
{
    public static AppSettingsDto Defaults { get; } = new(
        VaultPath: string.Empty,
        LlmProvider: "openai_compatible",
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
        SyncthingObsidianVaultPath: string.Empty,
        SyncthingApiKey: string.Empty,
        SyncthingBaseUrl: string.Empty);
}
