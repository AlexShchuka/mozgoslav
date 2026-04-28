using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Settings;

[ExtendObjectType(typeof(MutationType))]
public sealed class SettingsMutationType
{
    public async Task<UpdateSettingsPayload> UpdateSettings(
        UpdateSettingsInput input,
        [Service] IAppSettings appSettings,
        CancellationToken ct)
    {
        var dto = new AppSettingsDto(
            input.VaultPath,
            input.LlmProvider,
            input.LlmEndpoint,
            input.LlmModel,
            input.LlmApiKey,
            input.ObsidianApiHost,
            input.ObsidianApiToken,
            input.WhisperModelPath,
            input.VadModelPath,
            input.Language,
            input.ThemeMode,
            input.WhisperThreads,
            input.DictationEnabled,
            input.DictationHotkeyType,
            input.DictationMouseButton,
            input.DictationKeyboardHotkey,
            input.DictationLanguage,
            input.DictationWhisperModelId,
            input.DictationCaptureSampleRate,
            input.DictationLlmPolish,
            input.DictationInjectMode,
            input.DictationOverlayEnabled,
            input.DictationOverlayPosition,
            input.DictationSoundFeedback,
            input.DictationVocabulary,
            input.DictationModelUnloadMinutes,
            input.DictationTempAudioPath,
            input.DictationAppProfiles,
            input.SyncthingEnabled,
            input.SyncthingObsidianVaultPath,
            input.SyncthingApiKey,
            input.SyncthingBaseUrl,
            input.DictationPushToTalk,
            input.ObsidianFeatureEnabled,
            input.DictationDumpEnabled,
            input.DictationDumpHotkeyToggle,
            input.DictationDumpHotkeyHold,
            WebCacheTtlHours: 24,
            McpServerEnabled: input.McpServerEnabled,
            McpServerPort: input.McpServerPort,
            McpServerToken: input.McpServerToken,
            ActionsSkillEnabled: input.ActionsSkillEnabled,
            RemindersSkillEnabled: input.RemindersSkillEnabled,
            DictationClassifyIntentEnabled: input.DictationClassifyIntentEnabled,
            ClaudeCliPath: input.ClaudeCliPath);

        await appSettings.SaveAsync(dto, ct);
        var saved = await appSettings.LoadAsync(ct);
        return new UpdateSettingsPayload(saved, []);
    }
}
