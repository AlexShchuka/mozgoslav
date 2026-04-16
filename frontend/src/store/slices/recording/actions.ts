import type { Recording } from "../../../models";

export const LOAD_RECORDINGS = "recording/LOAD";
export const LOAD_RECORDINGS_SUCCESS = "recording/LOAD_SUCCESS";
export const LOAD_RECORDINGS_FAILURE = "recording/LOAD_FAILURE";
export const LOAD_RECORDINGS_UNAVAILABLE = "recording/LOAD_UNAVAILABLE";

export interface LoadRecordingsAction {
  type: typeof LOAD_RECORDINGS;
}

export interface LoadRecordingsSuccessAction {
  type: typeof LOAD_RECORDINGS_SUCCESS;
  payload: Recording[];
}

export interface LoadRecordingsFailureAction {
  type: typeof LOAD_RECORDINGS_FAILURE;
  payload: string;
}

export interface LoadRecordingsUnavailableAction {
  type: typeof LOAD_RECORDINGS_UNAVAILABLE;
}

export type RecordingAction =
  | LoadRecordingsAction
  | LoadRecordingsSuccessAction
  | LoadRecordingsFailureAction
  | LoadRecordingsUnavailableAction;

export const loadRecordings = (): LoadRecordingsAction => ({
  type: LOAD_RECORDINGS,
});

export const loadRecordingsSuccess = (recordings: Recording[]): LoadRecordingsSuccessAction => ({
  type: LOAD_RECORDINGS_SUCCESS,
  payload: recordings,
});

export const loadRecordingsFailure = (message: string): LoadRecordingsFailureAction => ({
  type: LOAD_RECORDINGS_FAILURE,
  payload: message,
});

export const loadRecordingsUnavailable = (): LoadRecordingsUnavailableAction => ({
  type: LOAD_RECORDINGS_UNAVAILABLE,
});
