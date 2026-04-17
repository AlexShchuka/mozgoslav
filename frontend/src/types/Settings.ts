export type ThemeMode = "system" | "light" | "dark";

export type DictationHotkeyType = "mouse" | "keyboard";

export type DictationInjectMode = "auto" | "clipboard";

export type DictationOverlayPosition = "cursor" | "corner" | "center";

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
  dictationHotkeyType: DictationHotkeyType;
  dictationMouseButton: number;
  dictationKeyboardHotkey: string;
  dictationLanguage: string;
  dictationWhisperModelId: string;
  dictationCaptureSampleRate: number;
  dictationLlmPolish: boolean;
  dictationInjectMode: DictationInjectMode;
  dictationOverlayEnabled: boolean;
  dictationOverlayPosition: DictationOverlayPosition;
  dictationSoundFeedback: boolean;
  dictationVocabulary: string[];
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  vaultPath: "",
  llmEndpoint: "http://localhost:1234",
  llmModel: "default",
  llmApiKey: "",
  obsidianApiHost: "http://127.0.0.1:27123",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "system",
  whisperThreads: 0,
  dictationEnabled: true,
  dictationHotkeyType: "mouse",
  dictationMouseButton: 5,
  dictationKeyboardHotkey: "Right-Option",
  dictationLanguage: "ru",
  dictationWhisperModelId: "whisper-large-v3-russian-antony66",
  dictationCaptureSampleRate: 48000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto",
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "cursor",
  dictationSoundFeedback: true,
  dictationVocabulary: [],
  onboardingComplete: false,
};
