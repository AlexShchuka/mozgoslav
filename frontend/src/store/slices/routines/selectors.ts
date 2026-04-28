import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { RoutinesState } from "./types";

const selectRoutinesState = (state: GlobalState): RoutinesState => state.routines;

export const selectAllRoutines = createSelector(selectRoutinesState, (slice) => slice.routines);

export const selectRoutinesLoading = createSelector(selectRoutinesState, (slice) => slice.isLoading);

export const selectRoutinesError = createSelector(selectRoutinesState, (slice) => slice.error);

export const selectIsTogglingRoutine = (key: string) =>
  createSelector(selectRoutinesState, (slice) => slice.togglingKeys[key] === true);

export const selectIsRunningRoutine = (key: string) =>
  createSelector(selectRoutinesState, (slice) => slice.runningKeys[key] === true);
