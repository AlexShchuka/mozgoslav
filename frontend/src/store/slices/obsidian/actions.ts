import type {ObsidianSetupReport} from "./types";

export const SETUP_OBSIDIAN = "obsidian/SETUP";
export const SETUP_OBSIDIAN_SUCCESS = "obsidian/SETUP_SUCCESS";
export const SETUP_OBSIDIAN_FAILURE = "obsidian/SETUP_FAILURE";

export const BULK_EXPORT = "obsidian/BULK_EXPORT";
export const BULK_EXPORT_DONE = "obsidian/BULK_EXPORT_DONE";

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

export interface BulkExportDoneAction {
    type: typeof BULK_EXPORT_DONE;
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
    | BulkExportDoneAction
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
export const bulkExportDone = (): BulkExportDoneAction => ({type: BULK_EXPORT_DONE});

export const applyLayout = (): ApplyLayoutAction => ({type: APPLY_LAYOUT});
export const applyLayoutDone = (): ApplyLayoutDoneAction => ({type: APPLY_LAYOUT_DONE});
