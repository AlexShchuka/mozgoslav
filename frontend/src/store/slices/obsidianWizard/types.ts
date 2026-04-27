import type { VaultDiagnosticsReport } from "../obsidian/apiTypes";

export interface ObsidianWizardState {
  readonly currentStep: number;
  readonly nextStep: number | null;
  readonly isStepRunning: boolean;
  readonly diagnostics: VaultDiagnosticsReport | null;
  readonly error: string | null;
  readonly isComplete: boolean;
}

export const initialObsidianWizardState: ObsidianWizardState = {
  currentStep: 1,
  nextStep: 1,
  isStepRunning: false,
  diagnostics: null,
  error: null,
  isComplete: false,
};
