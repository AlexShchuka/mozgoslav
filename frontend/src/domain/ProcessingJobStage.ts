export interface ProcessingJobStage {
  id: string;
  jobId: string;
  stageName: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
}
