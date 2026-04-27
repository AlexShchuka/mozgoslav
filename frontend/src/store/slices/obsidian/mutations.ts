import type { VaultDiagnosticsReport } from "./apiTypes";
import type { ObsidianState } from "./types";

export const beginSetup = (state: ObsidianState): ObsidianState => ({
  ...state,
  isSetupInProgress: true,
});

export const beginDiagnosticsLoad = (state: ObsidianState): ObsidianState => ({
  ...state,
  isDiagnosticsLoading: true,
  diagnosticsError: null,
});

export const setDiagnostics = (
  state: ObsidianState,
  report: VaultDiagnosticsReport
): ObsidianState => ({
  ...state,
  isDiagnosticsLoading: false,
  diagnostics: report,
  diagnosticsError: null,
});

export const setDiagnosticsError = (state: ObsidianState, error: string): ObsidianState => ({
  ...state,
  isDiagnosticsLoading: false,
  diagnosticsError: error,
});

export const beginReapplyBootstrap = (state: ObsidianState): ObsidianState => ({
  ...state,
  isReapplyingBootstrap: true,
});

export const beginReinstallPlugins = (state: ObsidianState): ObsidianState => ({
  ...state,
  isReinstallingPlugins: true,
});
