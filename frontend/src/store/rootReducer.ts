import { combineReducers } from "redux";
import { recordingReducer } from "./slices/recording";
import type { RecordingState } from "./slices/recording";
import { syncReducer } from "./slices/sync";
import type { SyncState } from "./slices/sync";
import { ragReducer } from "./slices/rag";
import type { RagState } from "./slices/rag";
import { profilesReducer } from "./slices/profiles";
import type { ProfilesState } from "./slices/profiles";
import { settingsReducer } from "./slices/settings";
import type { SettingsState } from "./slices/settings";
import { obsidianReducer } from "./slices/obsidian";
import type { ObsidianState } from "./slices/obsidian";
import { onboardingReducer } from "./slices/onboarding";
import type { OnboardingState } from "./slices/onboarding";
import { uiReducer } from "./slices/ui";
import type { UiState } from "./slices/ui";

export const rootReducer = combineReducers({
  recording: recordingReducer,
  sync: syncReducer,
  rag: ragReducer,
  profiles: profilesReducer,
  settings: settingsReducer,
  obsidian: obsidianReducer,
  onboarding: onboardingReducer,
  ui: uiReducer,
});

export interface GlobalState {
  recording: RecordingState;
  sync: SyncState;
  rag: RagState;
  profiles: ProfilesState;
  settings: SettingsState;
  obsidian: ObsidianState;
  onboarding: OnboardingState;
  ui: UiState;
}
