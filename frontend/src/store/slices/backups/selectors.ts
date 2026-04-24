import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { BackupsState } from "./types";

const selectBackupsState = (state: GlobalState): BackupsState => state.backups;

export const selectAllBackups = createSelector(selectBackupsState, (slice) => slice.items);

export const selectBackupsLoading = createSelector(selectBackupsState, (slice) => slice.isLoading);

export const selectBackupsCreating = createSelector(
  selectBackupsState,
  (slice) => slice.isCreating
);
