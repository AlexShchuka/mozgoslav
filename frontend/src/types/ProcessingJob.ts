export type JobStatus =
  | "Queued"
  | "Transcribing"
  | "Correcting"
  | "Summarizing"
  | "Exporting"
  | "Done"
  | "Failed";

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
}
