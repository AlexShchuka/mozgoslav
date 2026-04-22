import type {ObsidianState} from "./types";

export const beginSetup = (state: ObsidianState): ObsidianState => ({
    ...state,
    isSetupInProgress: true,
});

export const beginBulkExport = (state: ObsidianState): ObsidianState => ({
    ...state,
    isBulkExporting: true,
});

export const beginApplyLayout = (state: ObsidianState): ObsidianState => ({
    ...state,
    isApplyingLayout: true,
});
