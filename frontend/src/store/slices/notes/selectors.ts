import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { NotesState } from "./types";

const selectNotesState = (state: GlobalState): NotesState => state.notes;

export const selectAllNotes = createSelector(selectNotesState, (slice) =>
  Object.values(slice.byId)
);

export const selectNoteById = (id: string) =>
  createSelector(selectNotesState, (slice) => slice.byId[id] ?? null);

export const selectIsLoadingNotes = createSelector(
  selectNotesState,
  (slice) => slice.isLoadingList
);

export const selectIsSubmittingNote = createSelector(
  selectNotesState,
  (slice) => slice.isSubmitting
);

export const selectDeletingNoteIds = createSelector(selectNotesState, (slice) => slice.deletingIds);

export const selectExportingNoteIds = createSelector(
  selectNotesState,
  (slice) => slice.exportingIds
);

export const selectLastNotesListError = createSelector(
  selectNotesState,
  (slice) => slice.lastListError
);
