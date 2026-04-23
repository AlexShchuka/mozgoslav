import type { OnboardingState } from "./types";

export const advance = (state: OnboardingState, max: number): OnboardingState => ({
  ...state,
  currentStepIndex: Math.min(max, state.currentStepIndex + 1),
});

export const goToStep = (state: OnboardingState, index: number): OnboardingState => ({
  ...state,
  currentStepIndex: Math.max(0, index),
});
