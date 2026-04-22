export interface ObsidianSetupReport {
    readonly createdPaths: readonly string[];
}

export interface ObsidianApplyLayoutReport {
    readonly createdFolders: number;
    readonly movedNotes: number;
}

export interface ObsidianBulkExportReport {
    readonly exportedCount: number;
}

export interface ObsidianState {
    readonly isSetupInProgress: boolean;
    readonly isBulkExporting: boolean;
    readonly isApplyingLayout: boolean;
}

export const initialObsidianState: ObsidianState = {
    isSetupInProgress: false,
    isBulkExporting: false,
    isApplyingLayout: false,
};
