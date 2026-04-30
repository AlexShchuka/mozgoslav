import { expectSaga } from "redux-saga-test-plan";

import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import { saveSettings, saveSettingsFailure, saveSettingsSuccess } from "../actions";
import { saveSettingsSaga } from "../saga/saveSettingsSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const fakeSettings: AppSettings = {
  vaultPath: "/tmp",
  llmEndpoint: "http://localhost:1234",
  llmModel: "default",
  llmApiKey: "",
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "light",
  whisperThreads: 4,
  dictationEnabled: false,
  dictationHotkeyType: "mouse",
  dictationMouseButton: 4,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru",
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 16000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto",
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "bottom-center",
  dictationSoundFeedback: true,
  dictationVocabulary: [],
  dictationModelUnloadMinutes: 10,
  dictationTempAudioPath: "",
  dictationAppProfiles: {},
  dictationClassifyIntentEnabled: false,
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  syncthingApiKey: "",
  syncthingBaseUrl: "",
  dictationDumpEnabled: false,
  dictationDumpHotkeyToggle: "",
  dictationDumpHotkeyHold: "",
  sidecarEnrichmentEnabled: false,
  obsidianFeatureEnabled: false,
  llmProvider: "openai_compatible",
  webCacheTtlHours: 24,
  mcpServerEnabled: false,
  mcpServerPort: 51051,
  mcpServerToken: "",
  actionsSkillEnabled: false,
  remindersSkillEnabled: false,
  claudeCliPath: "",
};

const fakeSavedDto = {
  vaultPath: "/tmp",
  llmProvider: "openai_compatible",
  llmEndpoint: "http://localhost:1234",
  llmModel: "default",
  llmApiKey: "",
  webCacheTtlHours: 24,
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "light",
  whisperThreads: 4,
  dictationEnabled: false,
  dictationHotkeyType: "mouse",
  dictationMouseButton: 4,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru",
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 16000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto",
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "bottom-center",
  dictationSoundFeedback: true,
  dictationVocabulary: [],
  dictationModelUnloadMinutes: 10,
  dictationTempAudioPath: "",
  dictationAppProfiles: [],
  dictationClassifyIntentEnabled: false,
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  syncthingApiKey: "",
  syncthingBaseUrl: "",
  obsidianFeatureEnabled: false,
  mcpServerEnabled: false,
  mcpServerPort: 51051,
  mcpServerToken: "",
  actionsSkillEnabled: false,
  remindersSkillEnabled: false,
  claudeCliPath: "",
  dictationDumpEnabled: false,
  dictationDumpHotkeyToggle: "",
  dictationDumpHotkeyHold: "",
  sidecarEnrichmentEnabled: false,
};

describe("saveSettingsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts saveSettingsSuccess on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      updateSettings: { settings: fakeSavedDto, errors: [] },
    });

    await expectSaga(saveSettingsSaga, saveSettings(fakeSettings))
      .withReducer(settingsReducer)
      .put(saveSettingsSuccess(fakeSettings))
      .run();
  });

  it("puts saveSettingsFailure when settings is null", async () => {
    mockedRequest.mockResolvedValueOnce({
      updateSettings: { settings: null, errors: [{ code: "CONFLICT", message: "conflict" }] },
    });

    const result = await expectSaga(saveSettingsSaga, saveSettings(fakeSettings))
      .withReducer(settingsReducer)
      .put(saveSettingsFailure())
      .run();

    expect(result.storeState.isSaving).toBe(false);
  });

  it("puts notifyError + saveSettingsFailure on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("bad"));

    const result = await expectSaga(saveSettingsSaga, saveSettings(fakeSettings))
      .withReducer(settingsReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "bad" },
        })
      )
      .put(saveSettingsFailure())
      .run();

    expect(result.storeState.isSaving).toBe(false);
  });
});
