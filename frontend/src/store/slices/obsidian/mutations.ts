import type {ObsidianState} from "./types";

export const beginSetup = (state: ObsidianState): ObsidianState => ({
    ...state,
    isSetupInProgress: true,
    error: null,
});

export const beginBulkExport = (state: ObsidianState): ObsidianState => ({
    ...state,
    isBulkExporting: true,
    error: null,
});

export const beginApplyLayout = (state: ObsidianState): ObsidianState => ({
    ...state,
    isApplyingLayout: true,
    error: null,
});
