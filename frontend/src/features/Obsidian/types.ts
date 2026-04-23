import type { AppSettings } from "../../domain/Settings";
import type { VaultDiagnosticsReport } from "../../api/ObsidianApi";

export interface ObsidianStateProps {
  readonly settings: AppSettings | null;
  readonly isBulkExporting: boolean;
  readonly isApplyingLayout: boolean;
  readonly isSetupInProgress: boolean;
  readonly diagnostics: VaultDiagnosticsReport | null;
  readonly isDiagnosticsLoading: boolean;
  readonly diagnosticsError: string | null;
  readonly isReapplyingBootstrap: boolean;
  readonly isReinstallingPlugins: boolean;
}

export interface ObsidianDispatchProps {
  readonly onLoadSettings: () => void;
  readonly onSaveSettings: (settings: AppSettings) => void;
  readonly onSetup: (vaultPath?: string) => void;
  readonly onBulkExport: () => void;
  readonly onApplyLayout: () => void;
  readonly onFetchDiagnostics: () => void;
  readonly onReapplyBootstrap: () => void;
  readonly onReinstallPlugins: () => void;
}

export type ObsidianProps = ObsidianStateProps & ObsidianDispatchProps;
