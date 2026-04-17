import { combineReducers } from "redux";
import { recordingReducer } from "./slices/recording";
import type { RecordingState } from "./slices/recording";
import { syncReducer } from "./slices/sync";
import type { SyncState } from "./slices/sync";

export const rootReducer = combineReducers({
  recording: recordingReducer,
  sync: syncReducer,
});

export interface GlobalState {
  recording: RecordingState;
  sync: SyncState;
}
