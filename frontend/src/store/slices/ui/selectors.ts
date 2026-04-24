import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { UiState } from "./types";

const selectUiState = (state: GlobalState): UiState => state.ui;

export const selectThemeMode = createSelector(selectUiState, (slice) => slice.themeMode);
export const selectOpenModals = createSelector(selectUiState, (slice) => slice.openModals);
export const selectIsModalOpen = (id: string) =>
  createSelector(selectUiState, (slice) => slice.openModals.includes(id));
export const selectToasts = createSelector(selectUiState, (slice) => slice.toasts);

export const selectAllOpenNoteResolutions = createSelector(
  selectUiState,
  (slice) => slice.openNoteResolutions
);

export const selectOpenNoteResolution = (recordingId: string) =>
  createSelector(selectUiState, (slice) => slice.openNoteResolutions[recordingId] ?? null);
