export interface LlmHealth {
  readonly reachable: boolean;
  readonly loaded: boolean;
}

export interface ObsidianDetection {
  readonly detected: ReadonlyArray<{ readonly path: string; readonly name: string }>;
  readonly loaded: boolean;
}

export interface AudioCapabilities {
  readonly isSupported: boolean;
  readonly detectedPlatform: string;
  readonly permissionsRequired: readonly string[];
}

export interface AudioCapabilitiesState {
  readonly capabilities: AudioCapabilities | null;
  readonly loaded: boolean;
}

export interface OnboardingState {
  readonly completed: boolean;
  readonly currentStepIndex: number;
  readonly error: string | null;
  readonly llmHealth: LlmHealth;
  readonly obsidianDetection: ObsidianDetection;
  readonly audioCapabilities: AudioCapabilitiesState;
}

export const initialOnboardingState: OnboardingState = {
  completed: false,
  currentStepIndex: 0,
  error: null,
  llmHealth: { reachable: false, loaded: false },
  obsidianDetection: { detected: [], loaded: false },
  audioCapabilities: { capabilities: null, loaded: false },
};
