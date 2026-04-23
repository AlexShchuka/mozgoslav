import type { ProcessingJob } from "../../../domain/ProcessingJob";

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
  pending: Record<string, PendingJob>;
  isStreaming: boolean;
  lastError: string | null;
}

export const initialJobsState: JobsState = {
  byId: {},
  pending: {},
  isStreaming: false,
  lastError: null,
};
