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
  whisperThreads: 0,
  dictationEnabled: true,
  dictationHotkeyType: "mouse" as const,
  dictationMouseButton: 5,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru" as const,
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 48000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto" as const,
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "bottom-center" as const,
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
  obsidianFeatureEnabled: false,
  llmProvider: "openai_compatible",
  webCacheTtlHours: 24,
};

const renderSettings = () =>
  renderWithStore(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
    {
      theme: darkTheme,
      preloadedState: mergeMockState({
        ...mockSettingsState({ settings: baseSettings }),
        ...mockProfilesState({}),
      }),
    }
  );

describe("Settings autosave — new feature flag toggles dispatch SAVE_SETTINGS", () => {
  it("actionsSkillEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const checkbox = screen.getByTestId("settings-actions-skill-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("remindersSkillEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const checkbox = screen.getByTestId("settings-reminders-skill-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("mcpServerEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const checkbox = screen.getByTestId("settings-mcp-server-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("syncthingEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const checkbox = screen.getByTestId("settings-syncthing-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("dictationEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const checkbox = screen.getByTestId("settings-dictation-enabled");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("dictationLlmPolish toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const checkbox = screen.getByTestId("settings-dictation-llm-polish");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });

  it("dictationClassifyIntentEnabled toggle dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const checkbox = screen.getByTestId("settings-dictation-classify-intent");
    await act(async () => {
      fireEvent.click(checkbox);
    });
    expect(getActions().some((a) => a.type === SAVE_SETTINGS)).toBe(true);
  });
});

describe("Settings autosave — numeric field autosave on blur", () => {
  it("webCacheTtlHours numeric autosave on blur dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-llm"));
    const field = screen.getByTestId("field-webCacheTtlHours");
    const input = field.querySelector("input[type='number']") as HTMLInputElement;
    expect(input).not.toBeNull();
    await act(async () => {
      fireEvent.change(input, { target: { value: "48" } });
      fireEvent.blur(input, { target: { value: "48" } });
    });
    const saveActions = getActions().filter((a) => a.type === SAVE_SETTINGS);
    expect(saveActions.length).toBeGreaterThan(0);
    expect(saveActions[saveActions.length - 1].payload.webCacheTtlHours).toBe(48);
  });

  it("claudeCliPath string autosave on blur dispatches SAVE_SETTINGS", async () => {
    const { getActions } = renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const field = screen.getByTestId("field-claudeCliPath");
    const input = field.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    await act(async () => {
      fireEvent.change(input, { target: { value: "/usr/local/bin/claude" } });
      fireEvent.blur(input, { target: { value: "/usr/local/bin/claude" } });
    });
    const saveActions = getActions().filter((a) => a.type === SAVE_SETTINGS);
    expect(saveActions.length).toBeGreaterThan(0);
    expect(saveActions[saveActions.length - 1].payload.claudeCliPath).toBe("/usr/local/bin/claude");
  });
});
