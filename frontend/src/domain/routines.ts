export interface RoutineRun {
  id: string;
  routineKey: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  errorMessage: string | null;
  payloadSummary: string | null;
}

export interface RoutineDefinition {
  key: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  lastRun: RoutineRun | null;
}
