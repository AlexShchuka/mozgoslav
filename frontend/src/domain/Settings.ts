export type ThemeMode = "system" | "light" | "dark";
export type HotkeyType = "mouse" | "keyboard";
export type InjectMode = "auto" | "accessibility" | "cgevent" | "clipboard";
export type OverlayPosition = "bottom-center" | "top-right" | "cursor";
export type DictationLanguage = "ru" | "en" | "auto";

export interface AppSettings {
  vaultPath: string;
  obsidianFeatureEnabled: boolean;
  llmProvider: string;
  llmEndpoint: string;
  llmModel: string;
  llmApiKey: string;
  webCacheTtlHours: number;
  obsidianApiHost: string;
  obsidianApiToken: string;
  whisperModelPath: string;
  vadModelPath: string;
  language: string;
  themeMode: ThemeMode;
  whisperThreads: number;
  dictationEnabled: boolean;
  dictationHotkeyType: HotkeyType;
  dictationMouseButton: number;
  dictationKeyboardHotkey: string;
  dictationPushToTalk: boolean;
  dictationLanguage: DictationLanguage;
  dictationWhisperModelId: string;
  dictationCaptureSampleRate: number;
  dictationLlmPolish: boolean;
  dictationInjectMode: InjectMode;
  dictationOverlayEnabled: boolean;
  dictationOverlayPosition: OverlayPosition;
  dictationSoundFeedback: boolean;
  dictationVocabulary: string[];
  dictationModelUnloadMinutes: number;
  dictationTempAudioPath: string;
  dictationAppProfiles: Record<string, string>;
  dictationClassifyIntentEnabled: boolean;
  syncthingEnabled: boolean;
  syncthingObsidianVaultPath: string;
  syncthingApiKey: string;
  syncthingBaseUrl: string;
  mcpServerEnabled: boolean;
  mcpServerPort: number;
  mcpServerToken: string;
  actionsSkillEnabled: boolean;
  remindersSkillEnabled: boolean;
  claudeCliPath: string;
  dictationDumpEnabled: boolean;
  dictationDumpHotkeyToggle: string;
  dictationDumpHotkeyHold: string;
  sidecarEnrichmentEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: "",
  obsidianFeatureEnabled: false,
  llmProvider: "openai_compatible",
  llmEndpoint: "",
  llmModel: "",
  llmApiKey: "",
  webCacheTtlHours: 24,
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "system",
  whisperThreads: 0,
  dictationEnabled: true,
  dictationHotkeyType: "mouse",
  dictationMouseButton: 5,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru",
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 48000,
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
