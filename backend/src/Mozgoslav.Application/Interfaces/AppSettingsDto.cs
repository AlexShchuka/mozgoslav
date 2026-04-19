using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Snapshot of all persisted application settings. Immutable — updates are produced
/// via record <c>with</c> expressions and then persisted through
/// <see cref="IAppSettings.SaveAsync"/>.
/// </summary>
public sealed record AppSettingsDto(
    string VaultPath,
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
    int DictationModelUnloadMinutes,
    string DictationTempAudioPath,
    IReadOnlyDictionary<string, string> DictationAppProfiles,
    bool SyncthingEnabled,
    string SyncthingObsidianVaultPath,
    string SyncthingApiKey,
    string SyncthingBaseUrl,
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
            ["com.microsoft.VSCode"] = "code-profile",
            ["com.google.Chrome"] = "default",
            ["slack.com"] = "informal-profile",
        },
        SyncthingEnabled: true,
        SyncthingObsidianVaultPath: string.Empty,
        SyncthingApiKey: string.Empty,
        SyncthingBaseUrl: string.Empty);
}
