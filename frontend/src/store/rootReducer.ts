import { combineReducers } from "redux";
import type { RecordingState } from "./slices/recording";
import { recordingReducer } from "./slices/recording";
import type { SyncState } from "./slices/sync";
import { syncReducer } from "./slices/sync";
import type { RagState } from "./slices/rag";
import { ragReducer } from "./slices/rag";
import type { ProfilesState } from "./slices/profiles";
import { profilesReducer } from "./slices/profiles";
import type { SettingsState } from "./slices/settings";
import { settingsReducer } from "./slices/settings";
import type { ObsidianState } from "./slices/obsidian";
import { obsidianReducer } from "./slices/obsidian";
import type { OnboardingState } from "./slices/onboarding";
import { onboardingReducer } from "./slices/onboarding";
import type { UiState } from "./slices/ui";
import { uiReducer } from "./slices/ui";
import type { JobsState } from "./slices/jobs";
import { jobsReducer } from "./slices/jobs";
import type { DictationState } from "./slices/dictation";
import { dictationReducer } from "./slices/dictation";
import type { AudioDevicesState } from "./slices/audioDevices";
import { audioDevicesReducer } from "./slices/audioDevices";
import type { NotesState } from "./slices/notes";
import { notesReducer } from "./slices/notes";
import type { ModelsState } from "./slices/models";
import { modelsReducer } from "./slices/models";
import type { BackupsState } from "./slices/backups";
import { backupsReducer } from "./slices/backups";
import type { HotkeysState } from "./slices/hotkeys";
import { hotkeysReducer } from "./slices/hotkeys";

export const rootReducer = combineReducers({
  recording: recordingReducer,
  sync: syncReducer,
  rag: ragReducer,
  profiles: profilesReducer,
  settings: settingsReducer,
  obsidian: obsidianReducer,
  onboarding: onboardingReducer,
  ui: uiReducer,
  jobs: jobsReducer,
  dictation: dictationReducer,
  audioDevices: audioDevicesReducer,
  notes: notesReducer,
  models: modelsReducer,
  backups: backupsReducer,
  hotkeys: hotkeysReducer,
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
  jobs: JobsState;
  dictation: DictationState;
  audioDevices: AudioDevicesState;
  notes: NotesState;
  models: ModelsState;
  backups: BackupsState;
  hotkeys: HotkeysState;
}
