import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type {
  AudioCapabilitiesState,
  LlmHealth,
  ObsidianDetection,
  OnboardingState,
} from "./types";

const selectOnboardingState = (state: GlobalState): OnboardingState => state.onboarding;

export const selectOnboardingCompleted = createSelector(
  selectOnboardingState,
  (slice) => slice.completed
);
export const selectOnboardingStepIndex = createSelector(
  selectOnboardingState,
  (slice) => slice.currentStepIndex
);
export const selectOnboardingError = createSelector(selectOnboardingState, (slice) => slice.error);

export const selectLlmHealth = createSelector(
  selectOnboardingState,
  (slice): LlmHealth => slice.llmHealth
);

export const selectObsidianDetection = createSelector(
  selectOnboardingState,
  (slice): ObsidianDetection => slice.obsidianDetection
);

export const selectAudioCapabilities = createSelector(
  selectOnboardingState,
  (slice): AudioCapabilitiesState => slice.audioCapabilities
);
