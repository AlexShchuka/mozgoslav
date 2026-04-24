export type DictationStatus =
  | { phase: "idle" }
  | { phase: "starting"; source: string; persistOnStop: boolean }
  | { phase: "active"; sessionId: string; source: string; persistOnStop: boolean }
  | { phase: "stopping"; sessionId: string; persistOnStop: boolean }
  | { phase: "stopped"; polishedText: string | null; persistOnStop: boolean }
  | { phase: "failed"; error: string };

export interface DictationState {
  status: DictationStatus;
}

export const initialDictationState: DictationState = { status: { phase: "idle" } };
