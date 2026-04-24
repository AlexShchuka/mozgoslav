import type { Reducer } from "redux";
import {
  DELETE_RECORDING,
  DELETE_RECORDING_FAILURE,
  DELETE_RECORDING_SUCCESS,
  LOAD_RECORDINGS,
  LOAD_RECORDINGS_FAILURE,
  LOAD_RECORDINGS_SUCCESS,
  LOAD_RECORDINGS_UNAVAILABLE,
  type RecordingAction,
} from "./actions";
import { initialRecordingState, type RecordingState } from "./types";

export const recordingReducer: Reducer<RecordingState> = (
  state: RecordingState = initialRecordingState,
  action
): RecordingState => {
  const typed = action as RecordingAction;
  switch (typed.type) {
    case LOAD_RECORDINGS:
      return {
        ...state,
        isLoading: true,
        error: null,
        isBackendUnavailable: false,
      };
    case LOAD_RECORDINGS_SUCCESS: {
      const payload = (typed as { payload: RecordingState["recordings"][string][] }).payload;
      const byId = payload.reduce<RecordingState["recordings"]>((acc, recording) => {
        acc[recording.id] = recording;
        return acc;
      }, {});
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
        error: (typed as { payload: string }).payload,
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
    case DELETE_RECORDING: {
      const id = (typed as { payload: string }).payload;
      return {
        ...state,
        deletingIds: { ...state.deletingIds, [id]: true },
      };
    }
    case DELETE_RECORDING_SUCCESS: {
      const id = (typed as { payload: string }).payload;
      const { [id]: _removed, ...restRecordings } = state.recordings;
      const { [id]: _removedDeleting, ...restDeletingIds } = state.deletingIds;
      return {
        ...state,
        recordings: restRecordings,
        deletingIds: restDeletingIds,
      };
    }
    case DELETE_RECORDING_FAILURE: {
      const { id } = (typed as { payload: { id: string; error: string } }).payload;
      const { [id]: _removedDeleting, ...restDeletingIds } = state.deletingIds;
      return {
        ...state,
        deletingIds: restDeletingIds,
        error: (typed as { payload: { id: string; error: string } }).payload.error,
      };
    }
    default:
      return state;
  }
};
