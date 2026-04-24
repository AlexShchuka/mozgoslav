import type { VaultDiagnosticsReport } from "../../../api/ObsidianApi";

export interface ObsidianSetupReport {
  readonly createdPaths: readonly string[];
}

export interface ObsidianApplyLayoutReport {
  readonly createdFolders: number;
  readonly movedNotes: number;
}

export interface ObsidianBulkExportReport {
  readonly exportedCount: number;
  readonly skippedCount: number;
}

export interface ObsidianState {
  readonly isSetupInProgress: boolean;
  readonly isBulkExporting: boolean;
  readonly isApplyingLayout: boolean;
  readonly isDiagnosticsLoading: boolean;
  readonly isReapplyingBootstrap: boolean;
  readonly isReinstallingPlugins: boolean;
  readonly diagnostics: VaultDiagnosticsReport | null;
  readonly diagnosticsError: string | null;
}

export const initialObsidianState: ObsidianState = {
  isSetupInProgress: false,
  isBulkExporting: false,
  isApplyingLayout: false,
  isDiagnosticsLoading: false,
  isReapplyingBootstrap: false,
  isReinstallingPlugins: false,
  diagnostics: null,
  diagnosticsError: null,
};
