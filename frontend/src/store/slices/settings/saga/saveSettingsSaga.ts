import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type {
  MutationUpdateSettingsMutation,
  MutationUpdateSettingsMutationVariables,
} from "../../../../api/gql/graphql";
import { MutationUpdateSettingsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import {
  SAVE_SETTINGS,
  type SaveSettingsAction,
  saveSettingsFailure,
  saveSettingsSuccess,
} from "../actions";

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

export function* saveSettingsSaga(action: SaveSettingsAction): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      MutationUpdateSettingsDocument,
      { input: mapSettingsToInput(action.payload) }
    )) as MutationUpdateSettingsMutation;
    const dto = result.updateSettings.settings;
    if (dto) {
      yield put(saveSettingsSuccess(mapSavedToSettings(dto)));
    } else {
      yield put(saveSettingsFailure());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(
      notifyError({
        messageKey: "errors.genericErrorWithMessage",
        params: { message },
      })
    );
    yield put(saveSettingsFailure());
  }
}

export function* watchSaveSettings(): SagaIterator {
  yield takeLatest(SAVE_SETTINGS, saveSettingsSaga);
}
