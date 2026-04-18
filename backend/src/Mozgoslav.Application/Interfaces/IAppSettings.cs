namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Persistent application settings, stored in the <c>settings</c> key/value table.
/// Secrets (LLM API key, Obsidian token) stay local — they are never sent anywhere
/// outside the user-configured endpoint they belong to.
/// </summary>
public interface IAppSettings
{
    string VaultPath { get; }
    // BC-036 active LLM provider discriminator; see AppSettingsDto.LlmProvider.
    string LlmProvider { get; }
    string LlmEndpoint { get; }
    string LlmModel { get; }
    string LlmApiKey { get; }
    string ObsidianApiHost { get; }
    string ObsidianApiToken { get; }
    string WhisperModelPath { get; }
    string VadModelPath { get; }
    string Language { get; }
    string ThemeMode { get; }
    int WhisperThreads { get; }
    bool DictationEnabled { get; }
    string DictationHotkeyType { get; }
    int DictationMouseButton { get; }
    string DictationKeyboardHotkey { get; }
    bool DictationPushToTalk { get; }
    string DictationLanguage { get; }
    string DictationWhisperModelId { get; }
    int DictationCaptureSampleRate { get; }
    bool DictationLlmPolish { get; }
    string DictationInjectMode { get; }
    bool DictationOverlayEnabled { get; }
    string DictationOverlayPosition { get; }
    bool DictationSoundFeedback { get; }
    IReadOnlyList<string> DictationVocabulary { get; }
    int DictationModelUnloadMinutes { get; }
    string DictationTempAudioPath { get; }
    IReadOnlyDictionary<string, string> DictationAppProfiles { get; }
    bool SyncthingEnabled { get; }
    string SyncthingObsidianVaultPath { get; }
    string SyncthingApiKey { get; }
    string SyncthingBaseUrl { get; }

    AppSettingsDto Snapshot { get; }

    Task<AppSettingsDto> LoadAsync(CancellationToken ct);
    Task SaveAsync(AppSettingsDto dto, CancellationToken ct);
    Task ReloadAsync(CancellationToken ct);
}
