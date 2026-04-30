import { fireEvent, screen } from "@testing-library/react";
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
  llmApiKey: "sk-secret",
  obsidianApiHost: "",
  obsidianApiToken: "obs-token",
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
  dictationVocabulary: ["alpha", "bravo"],
  dictationModelUnloadMinutes: 10,
  dictationTempAudioPath: "",
  dictationAppProfiles: { "com.apple.Safari": "default" },
  dictationClassifyIntentEnabled: false,
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  syncthingApiKey: "sync-key",
  syncthingBaseUrl: "",
  mcpServerEnabled: false,
  mcpServerPort: 51051,
  mcpServerToken: "mcp-tok",
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

const renderSettings = (category?: string) => {
  const url = category ? `/?category=${category}` : "/";
  return renderWithStore(
    <MemoryRouter initialEntries={[url]}>
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
};

describe("Settings IA — all 5 categories render at least one field", () => {
  it("general category renders at least one field", () => {
    renderSettings();
    expect(screen.getByTestId("settings-category-general")).toBeInTheDocument();
    expect(screen.getByTestId("field-language")).toBeInTheDocument();
  });

  it("voice category renders at least one field", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    expect(screen.getByTestId("settings-category-voice")).toBeInTheDocument();
    expect(screen.getByTestId("field-dictationEnabled")).toBeInTheDocument();
  });

  it("llm category renders at least one field", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-llm"));
    expect(screen.getByTestId("settings-category-llm")).toBeInTheDocument();
    expect(screen.getByTestId("field-llmEndpoint")).toBeInTheDocument();
  });

  it("knowledge category renders at least one field", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-knowledge"));
    expect(screen.getByTestId("settings-category-knowledge")).toBeInTheDocument();
    expect(screen.getByTestId("field-obsidianApiHost")).toBeInTheDocument();
  });

  it("system category renders at least one field", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    expect(screen.getByTestId("settings-category-system")).toBeInTheDocument();
    expect(screen.getByTestId("field-mcpServerEnabled")).toBeInTheDocument();
  });
});

describe("Settings registry — sensitive fields use Input sensitive", () => {
  it("llmApiKey field is rendered as sensitive input", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-llm"));
    const llmApiKeyField = screen.getByTestId("field-llmApiKey");
    expect(llmApiKeyField).toBeInTheDocument();
    const input = llmApiKeyField.querySelector("input[type='password']");
    expect(input).not.toBeNull();
  });

  it("obsidianApiToken field is rendered as sensitive input", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-knowledge"));
    const tokenField = screen.getByTestId("field-obsidianApiToken");
    const input = tokenField.querySelector("input[type='password']");
    expect(input).not.toBeNull();
  });

  it("syncthingApiKey field is rendered as sensitive input", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const apiKeyField = screen.getByTestId("field-syncthingApiKey");
    const input = apiKeyField.querySelector("input[type='password']");
    expect(input).not.toBeNull();
  });

  it("mcpServerToken field is rendered as sensitive input", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-system"));
    const tokenField = screen.getByTestId("field-mcpServerToken");
    const input = tokenField.querySelector("input[type='password']");
    expect(input).not.toBeNull();
  });
});

describe("Settings registry — select fields render option lists", () => {
  it("language select renders ru and en options", () => {
    renderSettings();
    const langSelect = screen.getByTestId("field-language").querySelector("select");
    expect(langSelect).not.toBeNull();
    const options = Array.from(langSelect!.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("ru");
    expect(options).toContain("en");
  });

  it("themeMode select renders system, light, dark options", () => {
    renderSettings();
    const themeSelect = screen.getByTestId("field-themeMode").querySelector("select");
    expect(themeSelect).not.toBeNull();
    const options = Array.from(themeSelect!.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("system");
    expect(options).toContain("light");
    expect(options).toContain("dark");
  });

  it("dictationHotkeyType select renders mouse and keyboard options", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const select = screen.getByTestId("field-dictationHotkeyType").querySelector("select");
    expect(select).not.toBeNull();
    const options = Array.from(select!.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("mouse");
    expect(options).toContain("keyboard");
  });

  it("dictationInjectMode select renders auto, accessibility, cgevent, clipboard options", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const select = screen.getByTestId("field-dictationInjectMode").querySelector("select");
    expect(select).not.toBeNull();
    const options = Array.from(select!.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("auto");
    expect(options).toContain("accessibility");
    expect(options).toContain("cgevent");
    expect(options).toContain("clipboard");
  });

  it("dictationOverlayPosition select renders cursor, bottom-center, top-right options", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-sidebar-voice"));
    const select = screen.getByTestId("field-dictationOverlayPosition").querySelector("select");
    expect(select).not.toBeNull();
    const options = Array.from(select!.querySelectorAll("option")).map((o) => o.value);
    expect(options).toContain("cursor");
    expect(options).toContain("bottom-center");
    expect(options).toContain("top-right");
  });
});
