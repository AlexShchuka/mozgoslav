export const SET_STEP = "onboarding/SET_STEP";
export const NEXT_STEP = "onboarding/NEXT_STEP";
export const COMPLETE_ONBOARDING = "onboarding/COMPLETE";
export const RESET_ONBOARDING = "onboarding/RESET";
export const COMPLETION_LOADED = "onboarding/COMPLETION_LOADED";
export const COMPLETION_PERSIST_FAILED = "onboarding/COMPLETION_PERSIST_FAILED";

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

export type OnboardingAction =
  | SetStepAction
  | NextStepAction
  | CompleteOnboardingAction
  | ResetOnboardingAction
  | CompletionLoadedAction
  | CompletionPersistFailedAction;

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
