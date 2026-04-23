import type { VaultDiagnosticsReport } from "../../../api/ObsidianApi";

export const SETUP_OBSIDIAN = "obsidian/SETUP";
export const SETUP_OBSIDIAN_DONE = "obsidian/SETUP_DONE";

export const BULK_EXPORT = "obsidian/BULK_EXPORT";
export const BULK_EXPORT_DONE = "obsidian/BULK_EXPORT_DONE";

export const APPLY_LAYOUT = "obsidian/APPLY_LAYOUT";
export const APPLY_LAYOUT_DONE = "obsidian/APPLY_LAYOUT_DONE";

export const FETCH_DIAGNOSTICS = "obsidian/FETCH_DIAGNOSTICS";
export const FETCH_DIAGNOSTICS_DONE = "obsidian/FETCH_DIAGNOSTICS_DONE";
export const FETCH_DIAGNOSTICS_FAILED = "obsidian/FETCH_DIAGNOSTICS_FAILED";

export const REAPPLY_BOOTSTRAP = "obsidian/REAPPLY_BOOTSTRAP";
export const REAPPLY_BOOTSTRAP_DONE = "obsidian/REAPPLY_BOOTSTRAP_DONE";

export const REINSTALL_PLUGINS = "obsidian/REINSTALL_PLUGINS";
export const REINSTALL_PLUGINS_DONE = "obsidian/REINSTALL_PLUGINS_DONE";

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

export interface FetchDiagnosticsAction {
  type: typeof FETCH_DIAGNOSTICS;
}

export interface FetchDiagnosticsDoneAction {
  type: typeof FETCH_DIAGNOSTICS_DONE;
  payload: { report: VaultDiagnosticsReport };
}

export interface FetchDiagnosticsFailedAction {
  type: typeof FETCH_DIAGNOSTICS_FAILED;
  payload: { error: string };
}

export interface ReapplyBootstrapAction {
  type: typeof REAPPLY_BOOTSTRAP;
}

export interface ReapplyBootstrapDoneAction {
  type: typeof REAPPLY_BOOTSTRAP_DONE;
}

export interface ReinstallPluginsAction {
  type: typeof REINSTALL_PLUGINS;
}

export interface ReinstallPluginsDoneAction {
  type: typeof REINSTALL_PLUGINS_DONE;
}

export type ObsidianAction =
  | SetupObsidianAction
  | SetupObsidianDoneAction
  | BulkExportAction
  | BulkExportDoneAction
  | ApplyLayoutAction
  | ApplyLayoutDoneAction
  | FetchDiagnosticsAction
  | FetchDiagnosticsDoneAction
  | FetchDiagnosticsFailedAction
  | ReapplyBootstrapAction
  | ReapplyBootstrapDoneAction
  | ReinstallPluginsAction
  | ReinstallPluginsDoneAction;

export const setupObsidian = (vaultPath?: string): SetupObsidianAction => ({
  type: SETUP_OBSIDIAN,
  payload: { vaultPath },
});
export const setupObsidianDone = (): SetupObsidianDoneAction => ({ type: SETUP_OBSIDIAN_DONE });

export const bulkExport = (): BulkExportAction => ({ type: BULK_EXPORT });
export const bulkExportDone = (): BulkExportDoneAction => ({ type: BULK_EXPORT_DONE });

export const applyLayout = (): ApplyLayoutAction => ({ type: APPLY_LAYOUT });
export const applyLayoutDone = (): ApplyLayoutDoneAction => ({ type: APPLY_LAYOUT_DONE });

export const fetchDiagnostics = (): FetchDiagnosticsAction => ({ type: FETCH_DIAGNOSTICS });
export const fetchDiagnosticsDone = (
  report: VaultDiagnosticsReport
): FetchDiagnosticsDoneAction => ({
  type: FETCH_DIAGNOSTICS_DONE,
  payload: { report },
});
export const fetchDiagnosticsFailed = (error: string): FetchDiagnosticsFailedAction => ({
  type: FETCH_DIAGNOSTICS_FAILED,
  payload: { error },
});

export const reapplyBootstrap = (): ReapplyBootstrapAction => ({ type: REAPPLY_BOOTSTRAP });
export const reapplyBootstrapDone = (): ReapplyBootstrapDoneAction => ({
  type: REAPPLY_BOOTSTRAP_DONE,
});

export const reinstallPlugins = (): ReinstallPluginsAction => ({ type: REINSTALL_PLUGINS });
export const reinstallPluginsDone = (): ReinstallPluginsDoneAction => ({
  type: REINSTALL_PLUGINS_DONE,
});
