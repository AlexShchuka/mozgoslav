import { fireEvent, screen } from "@testing-library/react";

import Settings from "../Settings.container";
import { renderWithStore, mockSettingsState, mergeMockState, mockProfilesState } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
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

const renderSettings = () =>
  renderWithStore(<Settings />, {
    theme: darkTheme,
    preloadedState: mergeMockState({
      ...mockSettingsState({ settings: baseSettings }),
      ...mockProfilesState({}),
    }),
  });

describe("Settings → System links to Models/Backups/Routines", () => {
  it("System category renders link cards grid", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    expect(screen.getByTestId("settings-system-links")).toBeInTheDocument();
  });

  it("Manage Whisper models link points to /models?type=STT", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const link = screen.getByTestId("settings-system-link-models-whisper") as HTMLAnchorElement;
    expect(link.href).toContain("/models?type=STT");
  });

  it("View backups link points to /backup", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const link = screen.getByTestId("settings-system-link-backups") as HTMLAnchorElement;
    expect(link.href).toContain("/backup");
  });

  it("View routines link points to /routines", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const link = screen.getByTestId("settings-system-link-routines") as HTMLAnchorElement;
    expect(link.href).toContain("/routines");
  });
});
