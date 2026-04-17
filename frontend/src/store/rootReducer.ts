import { combineReducers } from "redux";
import { recordingReducer } from "./slices/recording";
import type { RecordingState } from "./slices/recording";
import { syncReducer } from "./slices/sync";
import type { SyncState } from "./slices/sync";
import { ragReducer } from "./slices/rag";
import type { RagState } from "./slices/rag";

export const rootReducer = combineReducers({
  recording: recordingReducer,
  sync: syncReducer,
  rag: ragReducer,
});

export interface GlobalState {
  recording: RecordingState;
  sync: SyncState;
  rag: RagState;
}
