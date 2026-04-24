import type { Recording } from "../../../domain";

export const LOAD_RECORDINGS = "recording/LOAD";
export const LOAD_RECORDINGS_SUCCESS = "recording/LOAD_SUCCESS";
export const LOAD_RECORDINGS_FAILURE = "recording/LOAD_FAILURE";
export const LOAD_RECORDINGS_UNAVAILABLE = "recording/LOAD_UNAVAILABLE";
export const DELETE_RECORDING = "recording/DELETE";
export const DELETE_RECORDING_SUCCESS = "recording/DELETE_SUCCESS";
export const DELETE_RECORDING_FAILURE = "recording/DELETE_FAILURE";

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

export interface DeleteRecordingAction {
  type: typeof DELETE_RECORDING;
  payload: string;
}

export interface DeleteRecordingSuccessAction {
  type: typeof DELETE_RECORDING_SUCCESS;
  payload: string;
}

export interface DeleteRecordingFailureAction {
  type: typeof DELETE_RECORDING_FAILURE;
  payload: { id: string; error: string };
}

export type RecordingAction =
  | LoadRecordingsAction
  | LoadRecordingsSuccessAction
  | LoadRecordingsFailureAction
  | LoadRecordingsUnavailableAction
  | DeleteRecordingAction
  | DeleteRecordingSuccessAction
  | DeleteRecordingFailureAction;

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

export const deleteRecording = (id: string): DeleteRecordingAction => ({
  type: DELETE_RECORDING,
  payload: id,
});

export const deleteRecordingSuccess = (id: string): DeleteRecordingSuccessAction => ({
  type: DELETE_RECORDING_SUCCESS,
  payload: id,
});

export const deleteRecordingFailure = (payload: {
  id: string;
  error: string;
}): DeleteRecordingFailureAction => ({
  type: DELETE_RECORDING_FAILURE,
  payload,
});
