import { fireEvent, screen } from "@testing-library/react";

import Settings from "../Settings.container";
import { renderWithStore, mockSettingsState, mergeMockState } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";
import { LOAD_LLM_MODELS_REQUESTED, LOAD_SETTINGS } from "../../../store/slices/settings";
import type { LlmModelDescriptor } from "../../../api/gql/graphql";

const baseSettings = {
  vaultPath: "",
  llmEndpoint: "http://localhost:1234",
  llmModel: "qwen2-7b",
  llmApiKey: "",
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "system" as const,
  whisperThreads: 4,
  dictationEnabled: false,
  dictationHotkeyType: "mouse" as const,
  dictationMouseButton: 4,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru",
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 16000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto" as const,
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "bottom-center" as const,
  dictationSoundFeedback: true,
  dictationVocabulary: [],
  dictationModelUnloadMinutes: 10,
  dictationTempAudioPath: "",
  dictationAppProfiles: {},
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  dictationDumpEnabled: false,
  dictationDumpHotkeyToggle: "",
  dictationDumpHotkeyHold: "",
};

const fakeModels: readonly LlmModelDescriptor[] = [
  {
    __typename: "LlmModelDescriptor",
    id: "qwen2-7b",
    ownedBy: "lm-studio",
    contextLength: 8192,
    supportsToolCalling: true,
    supportsJsonMode: true,
  },
  {
    __typename: "LlmModelDescriptor",
    id: "llama-3-8b",
    ownedBy: null,
    contextLength: null,
    supportsToolCalling: null,
    supportsJsonMode: null,
  },
];

const renderSettings = (patch: Parameters<typeof mockSettingsState>[0] = {}) =>
  renderWithStore(<Settings />, {
    theme: darkTheme,
    preloadedState: mergeMockState(
      mockSettingsState({
        settings: baseSettings,
        ...patch,
      })
    ),
  });

describe("Settings — store-driven", () => {
  it("dispatches LOAD_SETTINGS on mount", () => {
    const { getActions } = renderSettings();
    expect(getActions().some((a) => a.type === LOAD_SETTINGS)).toBe(true);
  });

  it("dispatches LOAD_LLM_MODELS_REQUESTED when LLM tab is opened", () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByText(/^LLM$/i));
    expect(getActions().some((a) => a.type === LOAD_LLM_MODELS_REQUESTED)).toBe(true);
  });

  it("renders models in dropdown when state holds llmModels", () => {
    renderSettings({
      settings: baseSettings,
      llmModels: { loading: false, available: fakeModels, error: false },
    });
    fireEvent.click(screen.getByText(/^LLM$/i));

    const select = screen.getByTestId("settings-llm-model-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const optionTexts = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(optionTexts).toEqual(expect.arrayContaining(["qwen2-7b", "llama-3-8b"]));
  });

  it("shows invalid-url validation error when endpoint malformed", () => {
    renderSettings({
      settings: { ...baseSettings, llmEndpoint: "not-a-url" },
    });
    fireEvent.click(screen.getByText(/^LLM$/i));

    expect(screen.getByText(/http:\/\/ или https:\/\//i)).toBeInTheDocument();
  });
});
