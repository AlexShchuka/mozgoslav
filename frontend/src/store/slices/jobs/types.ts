import type { ProcessingJob } from "../../../domain/ProcessingJob";
import type { ProcessingJobStage } from "../../../domain/ProcessingJobStage";

export interface PendingJob {
  tempId: string;
  kind: "uploading";
  label: string;
  startedAt: string;
  recordingId?: string;
  error?: string;
}

export interface JobsState {
  byId: Record<string, ProcessingJob>;
  stagesByJobId: Record<string, ProcessingJobStage[]>;
  pending: Record<string, PendingJob>;
  isStreaming: boolean;
  lastError: string | null;
  errors: Record<string, string>;
}

export const initialJobsState: JobsState = {
  byId: {},
  stagesByJobId: {},
  pending: {},
  isStreaming: false,
  lastError: null,
  errors: {},
};
