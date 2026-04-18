import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { OnboardingState } from "./types";

const selectOnboardingState = (state: GlobalState): OnboardingState => state.onboarding;

export const selectOnboardingCompleted = createSelector(
  selectOnboardingState,
  (slice) => slice.completed,
);
export const selectOnboardingStepIndex = createSelector(
  selectOnboardingState,
  (slice) => slice.currentStepIndex,
);
export const selectOnboardingError = createSelector(
  selectOnboardingState,
  (slice) => slice.error,
);
