import {combineReducers} from "redux";
import type {RecordingState} from "./slices/recording/types";
import {recordingReducer} from "./slices/recording/reducer";
import type {SyncState} from "./slices/sync/types";
import {syncReducer} from "./slices/sync/reducer";
import type {RagState} from "./slices/rag/types";
import {ragReducer} from "./slices/rag/reducer";
import type {ProfilesState} from "./slices/profiles/types";
import {profilesReducer} from "./slices/profiles/reducer";
import type {SettingsState} from "./slices/settings/types";
import {settingsReducer} from "./slices/settings/reducer";
import type {ObsidianState} from "./slices/obsidian/types";
import {obsidianReducer} from "./slices/obsidian/reducer";
import type {OnboardingState} from "./slices/onboarding/types";
import {onboardingReducer} from "./slices/onboarding/reducer";
import type {UiState} from "./slices/ui/types";
import {uiReducer} from "./slices/ui/reducer";
import type {JobsState} from "./slices/jobs/types";
import {jobsReducer} from "./slices/jobs/reducer";

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
}

export type RootState = ReturnType<typeof rootReducer>;
