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
  dictationLanguage: "ru" as const,
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
  mcpServerPort: 3030,
  mcpServerToken: "",
  actionsSkillEnabled: false,
  remindersSkillEnabled: false,
  claudeCliPath: "",
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
  renderWithStore(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
    {
      theme: darkTheme,
      preloadedState: mergeMockState({
        ...mockSettingsState({
          settings: baseSettings,
          ...patch,
        }),
        ...mockProfilesState({}),
      }),
    }
  );

describe("Settings — store-driven", () => {
  it("dispatches LOAD_SETTINGS on mount", () => {
    const { getActions } = renderSettings();
    expect(getActions().some((a) => a.type === LOAD_SETTINGS)).toBe(true);
  });

  it("sidebar renders 5 categories", () => {
    renderSettings();
    const sidebar = screen.getByRole("navigation");
    const buttons = sidebar.querySelectorAll("button");
    expect(buttons.length).toBe(5);
  });

  it("clicking a sidebar category changes active state", () => {
    renderSettings();
    const voiceBtn = screen.getByTestId("settings-sidebar-voice");
    fireEvent.click(voiceBtn);
    expect(voiceBtn).toHaveStyle("font-weight: 600");
  });

  it("clicking LLM category dispatches LOAD_LLM_MODELS_REQUESTED", () => {
    const { getActions } = renderSettings();
    const llmBtn = screen.getByTestId("settings-sidebar-llm");
    fireEvent.click(llmBtn);
    expect(getActions().some((a) => a.type === LOAD_LLM_MODELS_REQUESTED)).toBe(true);
  });

  it("renders models in dropdown when LLM category active", () => {
    renderSettings({
      settings: baseSettings,
      llmModels: { loading: false, available: fakeModels, error: false },
    });
    fireEvent.click(screen.getByTestId("settings-sidebar-llm"));

    const select = screen.getByTestId("settings-llm-model-select") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const optionTexts = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(optionTexts).toEqual(expect.arrayContaining(["qwen2-7b", "llama-3-8b"]));
  });

  it("shows invalid-url validation error when endpoint malformed", () => {
    renderSettings({
      settings: { ...baseSettings, llmEndpoint: "not-a-url" },
    });
    fireEvent.click(screen.getByTestId("settings-sidebar-llm"));
    expect(screen.getByText(/http:\/\/ или https:\/\//i)).toBeInTheDocument();
  });

  it("General category renders language and theme controls", () => {
    renderSettings();
    expect(screen.getByTestId("settings-category-general")).toBeInTheDocument();
  });

  it("search empty state shown when no fields match query", async () => {
    renderSettings();
    const searchInput = screen.getByTestId("settings-search");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "xyznonexistentfield999" } });
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId("settings-search-empty")).toBeInTheDocument();
  });

  it("System category renders links to Models, Backups, Routines", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    expect(screen.getByTestId("settings-system-links")).toBeInTheDocument();
    expect(screen.getByTestId("settings-system-link-backups")).toBeInTheDocument();
    expect(screen.getByTestId("settings-system-link-routines")).toBeInTheDocument();
  });

  it("Knowledge category renders Profiles section", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-knowledge"));
    expect(screen.getByTestId("settings-knowledge-profiles")).toBeInTheDocument();
  });
});
