import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QuerySettingsQuery } from "../../../../api/gql/graphql";
import { QuerySettingsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import { LOAD_SETTINGS, loadSettingsFailure, loadSettingsSuccess } from "../actions";

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
    dictationOverlayPosition:
      dto.dictationOverlayPosition as AppSettings["dictationOverlayPosition"],
    dictationSoundFeedback: dto.dictationSoundFeedback,
    dictationVocabulary: dto.dictationVocabulary,
    dictationModelUnloadMinutes: dto.dictationModelUnloadMinutes,
    dictationTempAudioPath: dto.dictationTempAudioPath,
    dictationAppProfiles: Object.fromEntries(
      dto.dictationAppProfiles.map((kv) => [kv.key, kv.value])
    ),
    syncthingEnabled: dto.syncthingEnabled,
    syncthingObsidianVaultPath: dto.syncthingObsidianVaultPath,
    dictationDumpEnabled: dto.dictationDumpEnabled,
    dictationDumpHotkeyToggle: dto.dictationDumpHotkeyToggle,
    dictationDumpHotkeyHold: dto.dictationDumpHotkeyHold,
  };
}

export function* loadSettingsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QuerySettingsDocument, {})) as QuerySettingsQuery;
    yield put(loadSettingsSuccess(mapDtoToSettings(result.settings)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(
      notifyError({
        messageKey: "errors.genericErrorWithMessage",
        params: { message },
      })
    );
    yield put(loadSettingsFailure());
  }
}

export function* watchLoadSettings(): SagaIterator {
  yield takeLatest(LOAD_SETTINGS, loadSettingsSaga);
}
