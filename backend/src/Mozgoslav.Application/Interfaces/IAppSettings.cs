using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IAppSettings
{
    string VaultPath { get; }
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
    bool ObsidianFeatureEnabled { get; }
    bool DictationDumpEnabled { get; }
    string DictationDumpHotkeyToggle { get; }
    string DictationDumpHotkeyHold { get; }
    string ObsidianBootstrapPins { get; }
    int WebCacheTtlHours { get; }
    bool McpServerEnabled { get; }
    int McpServerPort { get; }
    string McpServerToken { get; }
    bool ActionsSkillEnabled { get; }
    bool RemindersSkillEnabled { get; }
    bool DictationClassifyIntentEnabled { get; }
    string ClaudeCliPath { get; }
    bool SidecarEnrichmentEnabled { get; }

    AppSettingsDto Snapshot { get; }

    Task<AppSettingsDto> LoadAsync(CancellationToken ct);
    Task SaveAsync(AppSettingsDto dto, CancellationToken ct);
    Task ReloadAsync(CancellationToken ct);
}
