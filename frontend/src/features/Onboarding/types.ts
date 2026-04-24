export interface OnboardingStateProps {
  readonly completed: boolean;
  readonly currentStepIndex: number;
}

export interface OnboardingDispatchProps {
  readonly onNextStep: (max: number) => void;
  readonly onSetStep: (index: number) => void;
  readonly onComplete: () => void;
}

export type OnboardingProps = OnboardingStateProps & OnboardingDispatchProps;
