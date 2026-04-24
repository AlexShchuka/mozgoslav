import type { AudioCapabilities } from "./types";

export const SET_STEP = "onboarding/SET_STEP";
export const NEXT_STEP = "onboarding/NEXT_STEP";
export const COMPLETE_ONBOARDING = "onboarding/COMPLETE";
export const RESET_ONBOARDING = "onboarding/RESET";
export const COMPLETION_LOADED = "onboarding/COMPLETION_LOADED";
export const COMPLETION_PERSIST_FAILED = "onboarding/COMPLETION_PERSIST_FAILED";

export const START_LLM_HEALTH_PROBE = "onboarding/START_LLM_HEALTH_PROBE";
export const STOP_LLM_HEALTH_PROBE = "onboarding/STOP_LLM_HEALTH_PROBE";
export const LLM_HEALTH_UPDATED = "onboarding/LLM_HEALTH_UPDATED";

export const START_OBSIDIAN_DETECT_PROBE = "onboarding/START_OBSIDIAN_DETECT_PROBE";
export const STOP_OBSIDIAN_DETECT_PROBE = "onboarding/STOP_OBSIDIAN_DETECT_PROBE";
export const OBSIDIAN_DETECTION_UPDATED = "onboarding/OBSIDIAN_DETECTION_UPDATED";

export const START_AUDIO_CAPABILITIES_PROBE = "onboarding/START_AUDIO_CAPABILITIES_PROBE";
export const STOP_AUDIO_CAPABILITIES_PROBE = "onboarding/STOP_AUDIO_CAPABILITIES_PROBE";
export const AUDIO_CAPABILITIES_UPDATED = "onboarding/AUDIO_CAPABILITIES_UPDATED";

export interface SetStepAction {
  type: typeof SET_STEP;
  payload: { index: number };
}

export interface NextStepAction {
  type: typeof NEXT_STEP;
  payload: { max: number };
}

export interface CompleteOnboardingAction {
  type: typeof COMPLETE_ONBOARDING;
}

export interface ResetOnboardingAction {
  type: typeof RESET_ONBOARDING;
}

export interface CompletionLoadedAction {
  type: typeof COMPLETION_LOADED;
  payload: { completed: boolean };
}

export interface CompletionPersistFailedAction {
  type: typeof COMPLETION_PERSIST_FAILED;
  payload: string;
}

export interface StartLlmHealthProbeAction {
  type: typeof START_LLM_HEALTH_PROBE;
}

export interface StopLlmHealthProbeAction {
  type: typeof STOP_LLM_HEALTH_PROBE;
}

export interface LlmHealthUpdatedAction {
  type: typeof LLM_HEALTH_UPDATED;
  payload: { reachable: boolean };
}

export interface StartObsidianDetectProbeAction {
  type: typeof START_OBSIDIAN_DETECT_PROBE;
}

export interface StopObsidianDetectProbeAction {
  type: typeof STOP_OBSIDIAN_DETECT_PROBE;
}

export interface ObsidianDetectionUpdatedAction {
  type: typeof OBSIDIAN_DETECTION_UPDATED;
  payload: { detected: ReadonlyArray<{ readonly path: string; readonly name: string }> };
}

export interface StartAudioCapabilitiesProbeAction {
  type: typeof START_AUDIO_CAPABILITIES_PROBE;
}

export interface StopAudioCapabilitiesProbeAction {
  type: typeof STOP_AUDIO_CAPABILITIES_PROBE;
}

export interface AudioCapabilitiesUpdatedAction {
  type: typeof AUDIO_CAPABILITIES_UPDATED;
  payload: { capabilities: AudioCapabilities | null };
}

export type OnboardingAction =
  | SetStepAction
  | NextStepAction
  | CompleteOnboardingAction
  | ResetOnboardingAction
  | CompletionLoadedAction
  | CompletionPersistFailedAction
  | StartLlmHealthProbeAction
  | StopLlmHealthProbeAction
  | LlmHealthUpdatedAction
  | StartObsidianDetectProbeAction
  | StopObsidianDetectProbeAction
  | ObsidianDetectionUpdatedAction
  | StartAudioCapabilitiesProbeAction
  | StopAudioCapabilitiesProbeAction
  | AudioCapabilitiesUpdatedAction;

export const setStep = (index: number): SetStepAction => ({
  type: SET_STEP,
  payload: { index },
});
export const nextStep = (max: number): NextStepAction => ({
  type: NEXT_STEP,
  payload: { max },
});
export const completeOnboarding = (): CompleteOnboardingAction => ({
  type: COMPLETE_ONBOARDING,
});
export const resetOnboarding = (): ResetOnboardingAction => ({ type: RESET_ONBOARDING });
export const completionLoaded = (completed: boolean): CompletionLoadedAction => ({
  type: COMPLETION_LOADED,
  payload: { completed },
});
export const completionPersistFailed = (message: string): CompletionPersistFailedAction => ({
  type: COMPLETION_PERSIST_FAILED,
  payload: message,
});

export const startLlmHealthProbe = (): StartLlmHealthProbeAction => ({
  type: START_LLM_HEALTH_PROBE,
});
export const stopLlmHealthProbe = (): StopLlmHealthProbeAction => ({
  type: STOP_LLM_HEALTH_PROBE,
});
export const llmHealthUpdated = (payload: { reachable: boolean }): LlmHealthUpdatedAction => ({
  type: LLM_HEALTH_UPDATED,
  payload,
});

export const startObsidianDetectProbe = (): StartObsidianDetectProbeAction => ({
  type: START_OBSIDIAN_DETECT_PROBE,
});
export const stopObsidianDetectProbe = (): StopObsidianDetectProbeAction => ({
  type: STOP_OBSIDIAN_DETECT_PROBE,
});
export const obsidianDetectionUpdated = (payload: {
  detected: ReadonlyArray<{ readonly path: string; readonly name: string }>;
}): ObsidianDetectionUpdatedAction => ({
  type: OBSIDIAN_DETECTION_UPDATED,
  payload,
});

export const startAudioCapabilitiesProbe = (): StartAudioCapabilitiesProbeAction => ({
  type: START_AUDIO_CAPABILITIES_PROBE,
});
export const stopAudioCapabilitiesProbe = (): StopAudioCapabilitiesProbeAction => ({
  type: STOP_AUDIO_CAPABILITIES_PROBE,
});
export const audioCapabilitiesUpdated = (payload: {
  capabilities: AudioCapabilities | null;
}): AudioCapabilitiesUpdatedAction => ({
  type: AUDIO_CAPABILITIES_UPDATED,
  payload,
});
