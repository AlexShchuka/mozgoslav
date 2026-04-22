import type {ObsidianBulkExportReport, ObsidianSetupReport} from "./types";

export const SETUP_OBSIDIAN = "obsidian/SETUP";
export const SETUP_OBSIDIAN_SUCCESS = "obsidian/SETUP_SUCCESS";
export const SETUP_OBSIDIAN_FAILURE = "obsidian/SETUP_FAILURE";

export const BULK_EXPORT = "obsidian/BULK_EXPORT";
export const BULK_EXPORT_SUCCESS = "obsidian/BULK_EXPORT_SUCCESS";
export const BULK_EXPORT_FAILURE = "obsidian/BULK_EXPORT_FAILURE";

export const APPLY_LAYOUT = "obsidian/APPLY_LAYOUT";
export const APPLY_LAYOUT_DONE = "obsidian/APPLY_LAYOUT_DONE";

export interface SetupObsidianAction {
    type: typeof SETUP_OBSIDIAN;
    payload: { vaultPath?: string };
}

export interface SetupObsidianSuccessAction {
    type: typeof SETUP_OBSIDIAN_SUCCESS;
    payload: ObsidianSetupReport;
}

export interface SetupObsidianFailureAction {
    type: typeof SETUP_OBSIDIAN_FAILURE;
    payload: string;
}

export interface BulkExportAction {
    type: typeof BULK_EXPORT;
}

export interface BulkExportSuccessAction {
    type: typeof BULK_EXPORT_SUCCESS;
    payload: ObsidianBulkExportReport;
}

export interface BulkExportFailureAction {
    type: typeof BULK_EXPORT_FAILURE;
    payload: string;
}

export interface ApplyLayoutAction {
    type: typeof APPLY_LAYOUT;
}

export interface ApplyLayoutDoneAction {
    type: typeof APPLY_LAYOUT_DONE;
}

export type ObsidianAction =
    | SetupObsidianAction
    | SetupObsidianSuccessAction
    | SetupObsidianFailureAction
    | BulkExportAction
    | BulkExportSuccessAction
    | BulkExportFailureAction
    | ApplyLayoutAction
    | ApplyLayoutDoneAction;

export const setupObsidian = (vaultPath?: string): SetupObsidianAction => ({
    type: SETUP_OBSIDIAN,
    payload: {vaultPath},
});
export const setupObsidianSuccess = (
    report: ObsidianSetupReport,
): SetupObsidianSuccessAction => ({type: SETUP_OBSIDIAN_SUCCESS, payload: report});
export const setupObsidianFailure = (message: string): SetupObsidianFailureAction => ({
    type: SETUP_OBSIDIAN_FAILURE,
    payload: message,
});

export const bulkExport = (): BulkExportAction => ({type: BULK_EXPORT});
export const bulkExportSuccess = (
    report: ObsidianBulkExportReport,
): BulkExportSuccessAction => ({type: BULK_EXPORT_SUCCESS, payload: report});
export const bulkExportFailure = (message: string): BulkExportFailureAction => ({
    type: BULK_EXPORT_FAILURE,
    payload: message,
});

export const applyLayout = (): ApplyLayoutAction => ({type: APPLY_LAYOUT});
export const applyLayoutDone = (): ApplyLayoutDoneAction => ({type: APPLY_LAYOUT_DONE});
