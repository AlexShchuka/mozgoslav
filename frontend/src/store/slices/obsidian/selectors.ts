import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { ObsidianState } from "./types";

const selectObsidianState = (state: GlobalState): ObsidianState => state.obsidian;

export const selectObsidianIsSetupInProgress = createSelector(
  selectObsidianState,
  (slice) => slice.isSetupInProgress
);
export const selectObsidianDiagnostics = createSelector(
  selectObsidianState,
  (slice) => slice.diagnostics
);
export const selectObsidianDiagnosticsLoading = createSelector(
  selectObsidianState,
  (slice) => slice.isDiagnosticsLoading
);
export const selectObsidianDiagnosticsError = createSelector(
  selectObsidianState,
  (slice) => slice.diagnosticsError
);
export const selectObsidianIsReapplyingBootstrap = createSelector(
  selectObsidianState,
  (slice) => slice.isReapplyingBootstrap
);
export const selectObsidianIsReinstallingPlugins = createSelector(
  selectObsidianState,
  (slice) => slice.isReinstallingPlugins
);
