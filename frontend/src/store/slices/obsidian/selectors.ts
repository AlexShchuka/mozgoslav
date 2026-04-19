import {createSelector} from "reselect";
import type {GlobalState} from "../../rootReducer";
import type {ObsidianState} from "./types";

const selectObsidianState = (state: GlobalState): ObsidianState => state.obsidian;

export const selectObsidianIsBulkExporting = createSelector(
    selectObsidianState,
    (slice) => slice.isBulkExporting,
);
export const selectObsidianIsApplyingLayout = createSelector(
    selectObsidianState,
    (slice) => slice.isApplyingLayout,
);
export const selectObsidianIsSetupInProgress = createSelector(
    selectObsidianState,
    (slice) => slice.isSetupInProgress,
);
export const selectObsidianError = createSelector(
    selectObsidianState,
    (slice) => slice.error,
);
export const selectLastBulkExportReport = createSelector(
    selectObsidianState,
    (slice) => slice.lastBulkExportReport,
);
export const selectLastApplyLayoutReport = createSelector(
    selectObsidianState,
    (slice) => slice.lastApplyLayoutReport,
);
export const selectLastSetupReport = createSelector(
    selectObsidianState,
    (slice) => slice.lastSetupReport,
);
