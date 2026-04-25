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

export const selectRecordingsError = createSelector(selectRecordingState, (slice) => slice.error);

export const selectBackendUnavailable = createSelector(
  selectRecordingState,
  (slice) => slice.isBackendUnavailable
);

export const selectRecordingById = (id: string) =>
  createSelector(selectRecordingState, (slice) => slice.recordings[id] ?? null);

export const selectDeletingRecordingIds = createSelector(
  selectRecordingState,
  (slice) => slice.deletingIds
);

export const selectIsDeletingRecording = (id: string) =>
  createSelector(selectRecordingState, (slice) => slice.deletingIds[id] === true);

export const selectIsUploading = createSelector(selectRecordingState, (slice) => slice.isUploading);

export const selectLastUploadError = createSelector(
  selectRecordingState,
  (slice) => slice.lastUploadError
);

export const selectLivePartial = (recordingId: string) =>
  createSelector(selectRecordingState, (slice) => slice.livePartials[recordingId] ?? null);
