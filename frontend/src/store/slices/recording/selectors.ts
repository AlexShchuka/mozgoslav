import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { RecordingState } from "./types";

const selectRecordingState = (state: GlobalState): RecordingState => state.recording;

export const selectAllRecordings = createSelector(selectRecordingState, (slice) =>
  Object.values(slice.recordings)
);

export const selectRecordingsLoading = createSelector(
  selectRecordingState,
  (slice) => slice.isLoading
);

export const selectRecordingsError = createSelector(
  selectRecordingState,
  (slice) => slice.error
);

export const selectBackendUnavailable = createSelector(
  selectRecordingState,
  (slice) => slice.isBackendUnavailable
);

export const selectRecordingById = (id: string) =>
  createSelector(selectRecordingState, (slice) => slice.recordings[id] ?? null);
