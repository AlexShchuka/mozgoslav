import { combineReducers } from "redux";
import { recordingReducer } from "./slices/recording";
import type { RecordingState } from "./slices/recording";

export const rootReducer = combineReducers({
  recording: recordingReducer,
});

export interface GlobalState {
  recording: RecordingState;
}
