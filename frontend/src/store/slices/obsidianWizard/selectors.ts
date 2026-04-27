import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { ObsidianWizardState } from "./types";

const selectWizardState = (state: GlobalState): ObsidianWizardState => state.obsidianWizard;

export const selectWizardCurrentStep = createSelector(
  selectWizardState,
  (slice) => slice.currentStep
);
export const selectWizardNextStep = createSelector(selectWizardState, (slice) => slice.nextStep);
export const selectWizardIsStepRunning = createSelector(
  selectWizardState,
  (slice) => slice.isStepRunning
);
export const selectWizardDiagnostics = createSelector(
  selectWizardState,
  (slice) => slice.diagnostics
);
export const selectWizardError = createSelector(selectWizardState, (slice) => slice.error);
export const selectWizardIsComplete = createSelector(
  selectWizardState,
  (slice) => slice.isComplete
);
