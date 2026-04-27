import type { VaultDiagnosticsReport } from "./apiTypes";

export interface ObsidianSetupReport {
  readonly createdPaths: readonly string[];
}

export interface ObsidianState {
  readonly isSetupInProgress: boolean;
  readonly isDiagnosticsLoading: boolean;
  readonly isReapplyingBootstrap: boolean;
  readonly isReinstallingPlugins: boolean;
  readonly diagnostics: VaultDiagnosticsReport | null;
  readonly diagnosticsError: string | null;
}

export const initialObsidianState: ObsidianState = {
  isSetupInProgress: false,
  isDiagnosticsLoading: false,
  isReapplyingBootstrap: false,
  isReinstallingPlugins: false,
  diagnostics: null,
  diagnosticsError: null,
};
