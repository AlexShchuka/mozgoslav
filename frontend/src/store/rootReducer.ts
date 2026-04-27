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
import type { ObsidianWizardState } from "./slices/obsidianWizard";
import { obsidianWizardReducer } from "./slices/obsidianWizard";
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
import type { AskState } from "./slices/ask/reducer";
import { askReducer } from "./slices/ask/reducer";
import type { HealthState } from "./slices/health";
import { healthReducer } from "./slices/health";
import type { WebSearchState } from "./slices/webSearch/types";
import { webSearchReducer } from "./slices/webSearch";

export const rootReducer = combineReducers({
  recording: recordingReducer,
  sync: syncReducer,
  rag: ragReducer,
  profiles: profilesReducer,
  settings: settingsReducer,
  obsidian: obsidianReducer,
  obsidianWizard: obsidianWizardReducer,
  onboarding: onboardingReducer,
  ui: uiReducer,
  jobs: jobsReducer,
  dictation: dictationReducer,
  audioDevices: audioDevicesReducer,
  notes: notesReducer,
  models: modelsReducer,
  backups: backupsReducer,
  hotkeys: hotkeysReducer,
  health: healthReducer,
  ask: askReducer,
  webSearch: webSearchReducer,
});

export interface GlobalState {
  recording: RecordingState;
  sync: SyncState;
  rag: RagState;
  profiles: ProfilesState;
  settings: SettingsState;
  obsidian: ObsidianState;
  obsidianWizard: ObsidianWizardState;
  onboarding: OnboardingState;
  ui: UiState;
  jobs: JobsState;
  dictation: DictationState;
  audioDevices: AudioDevicesState;
  notes: NotesState;
  models: ModelsState;
  backups: BackupsState;
  hotkeys: HotkeysState;
  health: HealthState;
  ask: AskState;
  webSearch: WebSearchState;
}
