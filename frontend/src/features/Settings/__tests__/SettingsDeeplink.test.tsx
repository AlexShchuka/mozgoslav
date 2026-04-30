import { screen, act } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import createSagaMiddleware from "redux-saga";
import { ThemeProvider } from "styled-components";

import Settings from "../Settings.container";
import { mockSettingsState, mergeMockState, mockProfilesState } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import { rootReducer } from "../../../store/rootReducer";
import "../../../i18n";

const baseSettings = {
  vaultPath: "",
  llmEndpoint: "",
  llmModel: "",
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
  sidecarEnrichmentEnabled: false,
};

const renderSettingsAt = (path: string) => {
  const preloadedState = mergeMockState({
    ...mockSettingsState({ settings: baseSettings }),
    ...mockProfilesState({}),
  });
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, preloadedState as never, applyMiddleware(sagaMiddleware));
  return render(
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter initialEntries={[path]}>
          <Settings />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe("Settings deeplink ?focus=key", () => {
  it("?focus=llmEndpoint opens LLM category", async () => {
    await act(async () => {
      renderSettingsAt("/settings?focus=llmEndpoint");
    });
    expect(screen.getByTestId("settings-category-llm")).toBeInTheDocument();
  });

  it("?focus=obsidianApiHost opens Knowledge category", async () => {
    await act(async () => {
      renderSettingsAt("/settings?focus=obsidianApiHost");
    });
    expect(screen.getByTestId("settings-category-knowledge")).toBeInTheDocument();
  });

  it("?focus=nonexistent renders root without error", async () => {
    await act(async () => {
      renderSettingsAt("/settings?focus=nonexistentkey999");
    });
    expect(screen.getByTestId("settings-root")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("?category=system opens System category", async () => {
    await act(async () => {
      renderSettingsAt("/settings?category=system");
    });
    expect(screen.getByTestId("settings-category-system")).toBeInTheDocument();
  });
});
