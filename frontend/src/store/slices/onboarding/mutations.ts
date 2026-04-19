import type {OnboardingState} from "./types";

/** Clamps the next-step index to [0, max] so overshoots are safe. */
export const advance = (state: OnboardingState, max: number): OnboardingState => ({
    ...state,
    currentStepIndex: Math.min(max, state.currentStepIndex + 1),
});

export const goToStep = (state: OnboardingState, index: number): OnboardingState => ({
    ...state,
    currentStepIndex: Math.max(0, index),
});
