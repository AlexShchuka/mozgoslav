import type { AppSettings } from "../../domain/Settings";
import type { VaultDiagnosticsReport } from "../../store/slices/obsidian/apiTypes";

export interface ObsidianStateProps {
  readonly settings: AppSettings | null;
  readonly isSetupInProgress: boolean;
  readonly diagnostics: VaultDiagnosticsReport | null;
  readonly isDiagnosticsLoading: boolean;
  readonly diagnosticsError: string | null;
  readonly isReapplyingBootstrap: boolean;
  readonly isReinstallingPlugins: boolean;
  readonly wizardCurrentStep: number;
  readonly wizardNextStep: number | null;
  readonly wizardIsStepRunning: boolean;
  readonly wizardIsComplete: boolean;
  readonly wizardError: string | null;
}

export interface ObsidianDispatchProps {
  readonly onLoadSettings: () => void;
  readonly onSaveSettings: (settings: AppSettings) => void;
  readonly onSetup: (vaultPath?: string) => void;
  readonly onFetchDiagnostics: () => void;
  readonly onReapplyBootstrap: () => void;
  readonly onReinstallPlugins: () => void;
  readonly onRunWizardStep: (step: number) => void;
  readonly onResetWizard: () => void;
}

export type ObsidianProps = ObsidianStateProps & ObsidianDispatchProps;
