import type { VaultDiagnosticsReport } from "../obsidian/apiTypes";

export const RUN_WIZARD_STEP = "obsidianWizard/RUN_STEP";
export const RUN_WIZARD_STEP_DONE = "obsidianWizard/RUN_STEP_DONE";
export const RUN_WIZARD_STEP_FAILED = "obsidianWizard/RUN_STEP_FAILED";
export const RESET_WIZARD = "obsidianWizard/RESET";

export interface RunWizardStepAction {
  type: typeof RUN_WIZARD_STEP;
  payload: { step: number };
}

export interface RunWizardStepDoneAction {
  type: typeof RUN_WIZARD_STEP_DONE;
  payload: {
    currentStep: number;
    nextStep: number | null;
    diagnostics: VaultDiagnosticsReport | null;
  };
}

export interface RunWizardStepFailedAction {
  type: typeof RUN_WIZARD_STEP_FAILED;
  payload: { error: string };
}

export interface ResetWizardAction {
  type: typeof RESET_WIZARD;
}

export type ObsidianWizardActionType =
  | RunWizardStepAction
  | RunWizardStepDoneAction
  | RunWizardStepFailedAction
  | ResetWizardAction;

export const runWizardStep = (step: number): RunWizardStepAction => ({
  type: RUN_WIZARD_STEP,
  payload: { step },
});

export const runWizardStepDone = (
  currentStep: number,
  nextStep: number | null,
  diagnostics: VaultDiagnosticsReport | null
): RunWizardStepDoneAction => ({
  type: RUN_WIZARD_STEP_DONE,
  payload: { currentStep, nextStep, diagnostics },
});

export const runWizardStepFailed = (error: string): RunWizardStepFailedAction => ({
  type: RUN_WIZARD_STEP_FAILED,
  payload: { error },
});

export const resetWizard = (): ResetWizardAction => ({ type: RESET_WIZARD });
