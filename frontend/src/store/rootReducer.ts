import { combineReducers } from "redux";
import { recordingReducer } from "./slices/recording";
import type { RecordingState } from "./slices/recording";

export interface GlobalState {
  recording: RecordingState;
}

export const rootReducer = combineReducers<GlobalState>({
  recording: recordingReducer,
});
