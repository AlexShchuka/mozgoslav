import type { JobStage, ProcessingJob, ProcessingJobStage, Recording } from "../../domain";

export interface RecordingListProps {
  recordings: Recording[];
  isLoading: boolean;
  isBackendUnavailable: boolean;
  error: string | null;
  jobsByRecordingId: Record<string, ProcessingJob>;
  stagesByJobId: Record<string, ProcessingJobStage[]>;
  onLoad: () => void;
  onPauseJob: (jobId: string) => void;
  onResumeJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onRetryJobFromStage: (jobId: string, fromStage: JobStage, skipFailed: boolean) => void;
}
