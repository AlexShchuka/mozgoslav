import { fireEvent, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Settings from "../Settings.container";
import {
  renderWithStore,
  mockSettingsState,
  mergeMockState,
  mockProfilesState,
} from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";
import { SAVE_SETTINGS } from "../../../store/slices/settings";

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

const renderSettings = (patch: Parameters<typeof mockSettingsState>[0] = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
    {
      theme: darkTheme,
      preloadedState: mergeMockState({
        ...mockSettingsState({ settings: baseSettings, ...patch }),
        ...mockProfilesState({}),
      }),
    }
  );

describe("Settings autosave on blur", () => {
  it("no Save button is rendered in any category", () => {
    renderSettings();
    expect(screen.queryByText(/^Сохранить$/i)).not.toBeInTheDocument();
  });

  it("blur on language select dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    const langSelect = screen.getByTestId("field-language").querySelector("select");
    if (!langSelect) return;
    await act(async () => {
      fireEvent.change(langSelect, { target: { value: "en" } });
      fireEvent.blur(langSelect, { target: { value: "en" } });
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("checkbox change dispatches SAVE_SETTINGS immediately", async () => {
    const { getActions } = renderSettings();
    const advancedBtn = screen.getByTestId("settings-section-advanced");
    fireEvent.click(advancedBtn);
    const checkbox = screen.getByTestId("settings-sidecar-enrichment-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });
});
