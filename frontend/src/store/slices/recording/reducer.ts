import {
  LOAD_RECORDINGS,
  LOAD_RECORDINGS_FAILURE,
  LOAD_RECORDINGS_SUCCESS,
  LOAD_RECORDINGS_UNAVAILABLE,
  type RecordingAction,
} from "./actions";
import { initialRecordingState, type RecordingState } from "./types";

export const recordingReducer = (
  state: RecordingState = initialRecordingState,
  action: RecordingAction
): RecordingState => {
  switch (action.type) {
    case LOAD_RECORDINGS:
      return {
        ...state,
        isLoading: true,
        error: null,
        isBackendUnavailable: false,
      };
    case LOAD_RECORDINGS_SUCCESS: {
      const byId = action.payload.reduce<Record<string, (typeof action.payload)[number]>>(
        (acc, recording) => {
          acc[recording.id] = recording;
          return acc;
        },
        {}
      );
      return {
        ...state,
        recordings: byId,
        isLoading: false,
        error: null,
        isBackendUnavailable: false,
      };
    }
    case LOAD_RECORDINGS_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        isBackendUnavailable: false,
      };
    case LOAD_RECORDINGS_UNAVAILABLE:
      return {
        ...state,
        isLoading: false,
        error: null,
        isBackendUnavailable: true,
        recordings: {},
      };
    default:
      return state;
  }
};
