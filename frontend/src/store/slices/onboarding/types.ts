export interface OnboardingState {
    readonly completed: boolean;
    readonly currentStepIndex: number;
    readonly error: string | null;
}

export const initialOnboardingState: OnboardingState = {
    completed: false,
    currentStepIndex: 0,
    error: null,
};
