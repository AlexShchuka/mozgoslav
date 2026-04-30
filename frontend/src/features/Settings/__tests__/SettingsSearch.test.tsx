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

const baseSettings = {
  vaultPath: "",
  llmEndpoint: "http://localhost:1234",
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

describe("Settings search — live filter", () => {
  it("search input is present in sticky header", () => {
    renderSettings();
    expect(screen.getByTestId("settings-search")).toBeInTheDocument();
  });

  it("typing a query shows matching fields", async () => {
    renderSettings();
    const input = screen.getByTestId("settings-search");
    await act(async () => {
      fireEvent.change(input, { target: { value: "тема" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByTestId("settings-search-empty")).not.toBeInTheDocument();
  });

  it("unknown query shows empty state", async () => {
    renderSettings();
    const input = screen.getByTestId("settings-search");
    await act(async () => {
      fireEvent.change(input, { target: { value: "zzznonexistent999xyz" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId("settings-search-empty")).toBeInTheDocument();
  });

  it("@modified returns only fields changed from default", async () => {
    renderSettings({
      settings: { ...baseSettings, sidecarEnrichmentEnabled: true },
    });
    const input = screen.getByTestId("settings-search");
    await act(async () => {
      fireEvent.change(input, { target: { value: "@modified" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByTestId("settings-search-empty")).not.toBeInTheDocument();
  });

  it("@default returns fields at their default value", async () => {
    renderSettings();
    const input = screen.getByTestId("settings-search");
    await act(async () => {
      fireEvent.change(input, { target: { value: "@default" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.queryByTestId("settings-search-empty")).not.toBeInTheDocument();
  });
});
