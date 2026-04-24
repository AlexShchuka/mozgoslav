export const DICTATION_START_REQUESTED = "dictation/START_REQUESTED";
export const DICTATION_STARTED = "dictation/STARTED";
export const DICTATION_STOP_REQUESTED = "dictation/STOP_REQUESTED";
export const DICTATION_STOPPED = "dictation/STOPPED";
export const DICTATION_FAILED = "dictation/FAILED";
export const DICTATION_RESET = "dictation/RESET";

export interface DictationStartRequestedAction {
  type: typeof DICTATION_START_REQUESTED;
  payload: { source: string; persistOnStop: boolean };
}

export interface DictationStartedAction {
  type: typeof DICTATION_STARTED;
  payload: { sessionId: string };
}

export interface DictationStopRequestedAction {
  type: typeof DICTATION_STOP_REQUESTED;
}

export interface DictationStoppedAction {
  type: typeof DICTATION_STOPPED;
  payload: { polishedText: string | null };
}

export interface DictationFailedAction {
  type: typeof DICTATION_FAILED;
  payload: { error: string };
}

export interface DictationResetAction {
  type: typeof DICTATION_RESET;
}

export type DictationAction =
  | DictationStartRequestedAction
  | DictationStartedAction
  | DictationStopRequestedAction
  | DictationStoppedAction
  | DictationFailedAction
  | DictationResetAction;

export const dictationStartRequested = (payload: {
  source: string;
  persistOnStop: boolean;
}): DictationStartRequestedAction => ({
  type: DICTATION_START_REQUESTED,
  payload,
});

export const dictationStarted = (payload: { sessionId: string }): DictationStartedAction => ({
  type: DICTATION_STARTED,
  payload,
});

export const dictationStopRequested = (): DictationStopRequestedAction => ({
  type: DICTATION_STOP_REQUESTED,
});

export const dictationStopped = (payload: {
  polishedText: string | null;
}): DictationStoppedAction => ({
  type: DICTATION_STOPPED,
  payload,
});

export const dictationFailed = (payload: { error: string }): DictationFailedAction => ({
  type: DICTATION_FAILED,
  payload,
});

export const dictationReset = (): DictationResetAction => ({
  type: DICTATION_RESET,
});
