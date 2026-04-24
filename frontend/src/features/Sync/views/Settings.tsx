import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { graphqlClient } from "../../../api/graphqlClient";
import {
  MutationUpdateSettingsDocument,
  QuerySettingsDocument,
} from "../../../api/gql/graphql";
import type {
  MutationUpdateSettingsMutation,
  MutationUpdateSettingsMutationVariables,
  QuerySettingsQuery,
} from "../../../api/gql/graphql";
import type { AppSettings } from "../../../domain/Settings";
import { SubViewRoot, ToggleRow } from "../Sync.style";

function mapDtoToSettings(dto: QuerySettingsQuery["settings"]): AppSettings {
  return {
    vaultPath: dto.vaultPath,
    llmEndpoint: dto.llmEndpoint,
    llmModel: dto.llmModel,
    llmApiKey: dto.llmApiKey,
    obsidianApiHost: dto.obsidianApiHost,
    obsidianApiToken: dto.obsidianApiToken,
    whisperModelPath: dto.whisperModelPath,
    vadModelPath: dto.vadModelPath,
    language: dto.language,
    themeMode: dto.themeMode as AppSettings["themeMode"],
    whisperThreads: dto.whisperThreads,
    dictationEnabled: dto.dictationEnabled,
    dictationHotkeyType: dto.dictationHotkeyType as AppSettings["dictationHotkeyType"],
    dictationMouseButton: dto.dictationMouseButton,
    dictationKeyboardHotkey: dto.dictationKeyboardHotkey,
    dictationPushToTalk: dto.dictationPushToTalk,
    dictationLanguage: dto.dictationLanguage,
    dictationWhisperModelId: dto.dictationWhisperModelId,
    dictationCaptureSampleRate: dto.dictationCaptureSampleRate,
    dictationLlmPolish: dto.dictationLlmPolish,
    dictationInjectMode: dto.dictationInjectMode as AppSettings["dictationInjectMode"],
    dictationOverlayEnabled: dto.dictationOverlayEnabled,
    dictationOverlayPosition: dto.dictationOverlayPosition as AppSettings["dictationOverlayPosition"],
    dictationSoundFeedback: dto.dictationSoundFeedback,
    dictationVocabulary: dto.dictationVocabulary,
    dictationModelUnloadMinutes: dto.dictationModelUnloadMinutes,
    dictationTempAudioPath: dto.dictationTempAudioPath,
    dictationAppProfiles: Object.fromEntries(
      dto.dictationAppProfiles.map((kv) => [kv.key, kv.value])
    ),
    syncthingEnabled: dto.syncthingEnabled,
    syncthingObsidianVaultPath: dto.syncthingObsidianVaultPath,
  };
}

function mapSettingsToInput(
  s: AppSettings
): MutationUpdateSettingsMutationVariables["input"] {
  return {
    vaultPath: s.vaultPath,
    llmProvider: "",
    llmEndpoint: s.llmEndpoint,
    llmModel: s.llmModel,
    llmApiKey: s.llmApiKey,
    obsidianApiHost: s.obsidianApiHost,
    obsidianApiToken: s.obsidianApiToken,
    whisperModelPath: s.whisperModelPath,
    vadModelPath: s.vadModelPath,
    language: s.language,
    themeMode: s.themeMode,
    whisperThreads: s.whisperThreads,
    dictationEnabled: s.dictationEnabled,
    dictationHotkeyType: s.dictationHotkeyType,
    dictationMouseButton: s.dictationMouseButton,
    dictationKeyboardHotkey: s.dictationKeyboardHotkey,
    dictationPushToTalk: s.dictationPushToTalk,
    dictationLanguage: s.dictationLanguage,
    dictationWhisperModelId: s.dictationWhisperModelId,
    dictationCaptureSampleRate: s.dictationCaptureSampleRate,
    dictationLlmPolish: s.dictationLlmPolish,
    dictationInjectMode: s.dictationInjectMode,
    dictationOverlayEnabled: s.dictationOverlayEnabled,
    dictationOverlayPosition: s.dictationOverlayPosition,
    dictationSoundFeedback: s.dictationSoundFeedback,
    dictationVocabulary: s.dictationVocabulary,
    dictationModelUnloadMinutes: s.dictationModelUnloadMinutes,
    dictationTempAudioPath: s.dictationTempAudioPath,
    dictationAppProfiles: Object.entries(s.dictationAppProfiles).map(([key, value]) => ({
      key,
      value,
    })),
    syncthingEnabled: s.syncthingEnabled,
    syncthingObsidianVaultPath: s.syncthingObsidianVaultPath,
    syncthingApiKey: "",
    syncthingBaseUrl: "",
    obsidianFeatureEnabled: false,
  };
}

function mapSavedToSettings(
  dto: NonNullable<MutationUpdateSettingsMutation["updateSettings"]["settings"]>
): AppSettings {
  return mapDtoToSettings(dto as QuerySettingsQuery["settings"]);
}

const SettingsView: FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void graphqlClient
      .request(QuerySettingsDocument)
      .then((data) => setSettings(mapDtoToSettings(data.settings)))
      .catch(() => setSettings(null));
  }, []);

  const toggleEnabled = async (enabled: boolean) => {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, syncthingEnabled: enabled };
    try {
      const result = await graphqlClient.request(MutationUpdateSettingsDocument, {
        input: mapSettingsToInput(next),
      });
      const dto = result.updateSettings.settings;
      if (dto) {
        setSettings(mapSavedToSettings(dto));
      }
      toast.success(t("settings.savedToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SubViewRoot data-testid="sync-view-settings">
      <strong>{t("settings.tabs.sync")}</strong>
      <ToggleRow>
        <input
          type="checkbox"
          data-testid="sync-settings-enabled"
          checked={Boolean(settings?.syncthingEnabled)}
          disabled={!settings || saving}
          onChange={(event) => void toggleEnabled(event.target.checked)}
        />
        {t("sync.settings.enableSyncthing")}
      </ToggleRow>
    </SubViewRoot>
  );
};

export default SettingsView;
