import type { JobStatus } from "./enums";

export interface ProcessingJob {
  id: string;
  recordingId: string;
  profileId: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  userHint: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  // BC-017 — Phase 1 ADR §4.BC-016 + Phase 2 Backend MR B emit this flag when
  // a worker picks up a crash-recovered job that had at least one chunk
  // transcribed before the previous session died.
  resumedFromCheckpoint?: boolean;
  // The ISO timestamp of the last checkpoint. The UI renders
  // "Resumed from HH:MM" next to the progress bar when present.
  checkpointAt?: string | null;
}
