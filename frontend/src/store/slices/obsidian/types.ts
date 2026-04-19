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
    readonly lastSetupReport: ObsidianSetupReport | null;
    readonly lastBulkExportReport: ObsidianBulkExportReport | null;
    readonly lastApplyLayoutReport: ObsidianApplyLayoutReport | null;
    readonly error: string | null;
}

export const initialObsidianState: ObsidianState = {
    isSetupInProgress: false,
    isBulkExporting: false,
    isApplyingLayout: false,
    lastSetupReport: null,
    lastBulkExportReport: null,
    lastApplyLayoutReport: null,
    error: null,
};
