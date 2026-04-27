import type { Reducer } from "redux";

import {
  type ObsidianWizardActionType,
  RESET_WIZARD,
  RUN_WIZARD_STEP,
  RUN_WIZARD_STEP_DONE,
  RUN_WIZARD_STEP_FAILED,
} from "./actions";
import { initialObsidianWizardState, type ObsidianWizardState } from "./types";

export const obsidianWizardReducer: Reducer<ObsidianWizardState> = (
  state: ObsidianWizardState = initialObsidianWizardState,
  action
): ObsidianWizardState => {
  const typed = action as ObsidianWizardActionType;
  switch (typed.type) {
    case RUN_WIZARD_STEP:
      return { ...state, isStepRunning: true, error: null };
    case RUN_WIZARD_STEP_DONE:
      return {
        ...state,
        isStepRunning: false,
        currentStep: typed.payload.currentStep,
        nextStep: typed.payload.nextStep,
        diagnostics: typed.payload.diagnostics ?? state.diagnostics,
        isComplete: typed.payload.nextStep === null,
        error: null,
      };
    case RUN_WIZARD_STEP_FAILED:
      return {
        ...state,
        isStepRunning: false,
        error: typed.payload.error,
      };
    case RESET_WIZARD:
      return initialObsidianWizardState;
    default:
      return state;
  }
};
