export type ThemeMode = "system" | "light" | "dark";
export type HotkeyType = "mouse" | "keyboard";
export type InjectMode = "auto" | "accessibility" | "cgevent" | "clipboard";
export type OverlayPosition = "bottom-center" | "top-right" | "cursor";

export interface AppSettings {
  vaultPath: string;
  llmEndpoint: string;
  llmModel: string;
  llmApiKey: string;
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
  dictationLanguage: string;
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
  syncthingEnabled: boolean;
  syncthingObsidianVaultPath: string;
  dictationDumpEnabled: boolean;
  dictationDumpHotkeyToggle: string;
  dictationDumpHotkeyHold: string;
  sidecarEnrichmentEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: "",
  llmEndpoint: "",
  llmModel: "",
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
  dictationDumpEnabled: false,
  dictationDumpHotkeyToggle: "",
  dictationDumpHotkeyHold: "",
  sidecarEnrichmentEnabled: false,
};
