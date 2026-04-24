import { expectSaga } from "redux-saga-test-plan";

import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import { loadSettingsFailure, loadSettingsSuccess } from "../actions";
import { loadSettingsSaga } from "../saga/loadSettingsSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const fakeDto = {
  vaultPath: "/tmp",
  llmProvider: "openai_compatible",
  llmEndpoint: "http://localhost:1234",
  llmModel: "default",
  llmApiKey: "",
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "system",
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
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  syncthingApiKey: "",
  syncthingBaseUrl: "",
  obsidianFeatureEnabled: false,
};

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
  themeMode: "system",
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
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
};

describe("loadSettingsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts loadSettingsSuccess on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({ settings: fakeDto });

    await expectSaga(loadSettingsSaga)
      .withReducer(settingsReducer)
      .put(loadSettingsSuccess(fakeSettings))
      .run();
  });

  it("puts notifyError + loadSettingsFailure on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("no net"));

    const result = await expectSaga(loadSettingsSaga)
      .withReducer(settingsReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "no net" },
        })
      )
      .put(loadSettingsFailure())
      .run();

    expect(result.storeState.isLoading).toBe(false);
  });
});
