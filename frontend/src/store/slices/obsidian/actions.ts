export const SETUP_OBSIDIAN = "obsidian/SETUP";
export const SETUP_OBSIDIAN_DONE = "obsidian/SETUP_DONE";

export const BULK_EXPORT = "obsidian/BULK_EXPORT";
export const BULK_EXPORT_DONE = "obsidian/BULK_EXPORT_DONE";

export const APPLY_LAYOUT = "obsidian/APPLY_LAYOUT";
export const APPLY_LAYOUT_DONE = "obsidian/APPLY_LAYOUT_DONE";

export interface SetupObsidianAction {
    type: typeof SETUP_OBSIDIAN;
    payload: { vaultPath?: string };
}

export interface SetupObsidianDoneAction {
    type: typeof SETUP_OBSIDIAN_DONE;
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
    | SetupObsidianDoneAction
    | BulkExportAction
    | BulkExportDoneAction
    | ApplyLayoutAction
    | ApplyLayoutDoneAction;

export const setupObsidian = (vaultPath?: string): SetupObsidianAction => ({
    type: SETUP_OBSIDIAN,
    payload: {vaultPath},
});
export const setupObsidianDone = (): SetupObsidianDoneAction => ({type: SETUP_OBSIDIAN_DONE});

export const bulkExport = (): BulkExportAction => ({type: BULK_EXPORT});
export const bulkExportDone = (): BulkExportDoneAction => ({type: BULK_EXPORT_DONE});

export const applyLayout = (): ApplyLayoutAction => ({type: APPLY_LAYOUT});
export const applyLayoutDone = (): ApplyLayoutDoneAction => ({type: APPLY_LAYOUT_DONE});
