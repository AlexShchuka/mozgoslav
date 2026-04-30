import type { JobStage, ProcessingJob } from "../../../domain";
import type { PendingJob } from "./types";

export const SUBSCRIBE_JOBS = "jobs/SUBSCRIBE";
export const UNSUBSCRIBE_JOBS = "jobs/UNSUBSCRIBE";
export const JOBS_SEEDED = "jobs/SEEDED";
export const JOBS_SEED_FAILED = "jobs/SEED_FAILED";
export const JOB_UPDATED = "jobs/UPDATED";
export const JOBS_STREAM_OPENED = "jobs/STREAM_OPENED";
export const JOBS_STREAM_CLOSED = "jobs/STREAM_CLOSED";

export const PENDING_JOB_CREATED = "jobs/PENDING_CREATED";
export const PENDING_JOB_RESOLVED = "jobs/PENDING_RESOLVED";
export const PENDING_JOB_FAILED = "jobs/PENDING_FAILED";

export const CANCEL_JOB = "jobs/CANCEL";
export const RETRY_RECORDING = "jobs/RETRY_RECORDING";

export const PAUSE_JOB_REQUESTED = "jobs/PAUSE_REQUESTED";
export const PAUSE_JOB_SUCCEEDED = "jobs/PAUSE_SUCCEEDED";
export const PAUSE_JOB_FAILED = "jobs/PAUSE_FAILED";

export const RESUME_JOB_REQUESTED = "jobs/RESUME_REQUESTED";
export const RESUME_JOB_SUCCEEDED = "jobs/RESUME_SUCCEEDED";
export const RESUME_JOB_FAILED = "jobs/RESUME_FAILED";

export const RETRY_JOB_FROM_STAGE_REQUESTED = "jobs/RETRY_FROM_STAGE_REQUESTED";
export const RETRY_JOB_FROM_STAGE_SUCCEEDED = "jobs/RETRY_FROM_STAGE_SUCCEEDED";
export const RETRY_JOB_FROM_STAGE_FAILED = "jobs/RETRY_FROM_STAGE_FAILED";

export interface SubscribeJobsAction {
  type: typeof SUBSCRIBE_JOBS;
}

export interface UnsubscribeJobsAction {
  type: typeof UNSUBSCRIBE_JOBS;
}

export interface JobsSeededAction {
  type: typeof JOBS_SEEDED;
  payload: ProcessingJob[];
}

export interface JobsSeedFailedAction {
  type: typeof JOBS_SEED_FAILED;
  payload: string;
}

export interface JobUpdatedAction {
  type: typeof JOB_UPDATED;
  payload: ProcessingJob;
}

export interface JobsStreamOpenedAction {
  type: typeof JOBS_STREAM_OPENED;
}

export interface JobsStreamClosedAction {
  type: typeof JOBS_STREAM_CLOSED;
}

export interface PendingJobCreatedAction {
  type: typeof PENDING_JOB_CREATED;
  payload: PendingJob;
}

export interface PendingJobResolvedAction {
  type: typeof PENDING_JOB_RESOLVED;
  payload: { tempId: string; recordingId?: string };
}

export interface PendingJobFailedAction {
  type: typeof PENDING_JOB_FAILED;
  payload: { tempId: string; error: string };
}

export interface CancelJobAction {
  type: typeof CANCEL_JOB;
  payload: { jobId: string };
}

export interface RetryRecordingAction {
  type: typeof RETRY_RECORDING;
  payload: { recordingId: string; profileId: string };
}

export interface PauseJobRequestedAction {
  type: typeof PAUSE_JOB_REQUESTED;
  payload: { jobId: string };
}

export interface PauseJobSucceededAction {
  type: typeof PAUSE_JOB_SUCCEEDED;
  payload: { jobId: string };
}

export interface PauseJobFailedAction {
  type: typeof PAUSE_JOB_FAILED;
  payload: { jobId: string; error: string };
}

export interface ResumeJobRequestedAction {
  type: typeof RESUME_JOB_REQUESTED;
  payload: { jobId: string };
}

export interface ResumeJobSucceededAction {
  type: typeof RESUME_JOB_SUCCEEDED;
  payload: { job: ProcessingJob };
}

export interface ResumeJobFailedAction {
  type: typeof RESUME_JOB_FAILED;
  payload: { jobId: string; error: string };
}

export interface RetryJobFromStageRequestedAction {
  type: typeof RETRY_JOB_FROM_STAGE_REQUESTED;
  payload: { jobId: string; fromStage: JobStage; skipFailed: boolean };
}

export interface RetryJobFromStageSucceededAction {
  type: typeof RETRY_JOB_FROM_STAGE_SUCCEEDED;
  payload: { job: ProcessingJob };
}

export interface RetryJobFromStageFailedAction {
  type: typeof RETRY_JOB_FROM_STAGE_FAILED;
  payload: { jobId: string; error: string };
}

export type JobsAction =
  | SubscribeJobsAction
  | UnsubscribeJobsAction
  | JobsSeededAction
  | JobsSeedFailedAction
  | JobUpdatedAction
  | JobsStreamOpenedAction
  | JobsStreamClosedAction
  | PendingJobCreatedAction
  | PendingJobResolvedAction
  | PendingJobFailedAction
  | CancelJobAction
  | RetryRecordingAction
  | PauseJobRequestedAction
  | PauseJobSucceededAction
  | PauseJobFailedAction
  | ResumeJobRequestedAction
  | ResumeJobSucceededAction
  | ResumeJobFailedAction
  | RetryJobFromStageRequestedAction
  | RetryJobFromStageSucceededAction
  | RetryJobFromStageFailedAction;

export const subscribeJobs = (): SubscribeJobsAction => ({ type: SUBSCRIBE_JOBS });
export const unsubscribeJobs = (): UnsubscribeJobsAction => ({ type: UNSUBSCRIBE_JOBS });
export const jobsSeeded = (jobs: ProcessingJob[]): JobsSeededAction => ({
  type: JOBS_SEEDED,
  payload: jobs,
});
export const jobsSeedFailed = (error: string): JobsSeedFailedAction => ({
  type: JOBS_SEED_FAILED,
  payload: error,
});
export const jobUpdated = (job: ProcessingJob): JobUpdatedAction => ({
  type: JOB_UPDATED,
  payload: job,
});
export const jobsStreamOpened = (): JobsStreamOpenedAction => ({ type: JOBS_STREAM_OPENED });
export const jobsStreamClosed = (): JobsStreamClosedAction => ({ type: JOBS_STREAM_CLOSED });
export const pendingJobCreated = (pending: PendingJob): PendingJobCreatedAction => ({
  type: PENDING_JOB_CREATED,
  payload: pending,
});
export const pendingJobResolved = (payload: {
  tempId: string;
  recordingId?: string;
}): PendingJobResolvedAction => ({ type: PENDING_JOB_RESOLVED, payload });
export const pendingJobFailed = (payload: {
  tempId: string;
  error: string;
}): PendingJobFailedAction => ({ type: PENDING_JOB_FAILED, payload });
export const cancelJob = (jobId: string): CancelJobAction => ({
  type: CANCEL_JOB,
  payload: { jobId },
});
export const retryRecording = (recordingId: string, profileId: string): RetryRecordingAction => ({
  type: RETRY_RECORDING,
  payload: { recordingId, profileId },
});

export const pauseJobRequested = (jobId: string): PauseJobRequestedAction => ({
  type: PAUSE_JOB_REQUESTED,
  payload: { jobId },
});

export const pauseJobSucceeded = (jobId: string): PauseJobSucceededAction => ({
  type: PAUSE_JOB_SUCCEEDED,
  payload: { jobId },
});

export const pauseJobFailed = (jobId: string, error: string): PauseJobFailedAction => ({
  type: PAUSE_JOB_FAILED,
  payload: { jobId, error },
});

export const resumeJobRequested = (jobId: string): ResumeJobRequestedAction => ({
  type: RESUME_JOB_REQUESTED,
  payload: { jobId },
});

export const resumeJobSucceeded = (job: ProcessingJob): ResumeJobSucceededAction => ({
  type: RESUME_JOB_SUCCEEDED,
  payload: { job },
});

export const resumeJobFailed = (jobId: string, error: string): ResumeJobFailedAction => ({
  type: RESUME_JOB_FAILED,
  payload: { jobId, error },
});

export const retryJobFromStageRequested = (
  jobId: string,
  fromStage: JobStage,
  skipFailed: boolean
): RetryJobFromStageRequestedAction => ({
  type: RETRY_JOB_FROM_STAGE_REQUESTED,
  payload: { jobId, fromStage, skipFailed },
});

export const retryJobFromStageSucceeded = (
  job: ProcessingJob
): RetryJobFromStageSucceededAction => ({
  type: RETRY_JOB_FROM_STAGE_SUCCEEDED,
  payload: { job },
});

export const retryJobFromStageFailed = (
  jobId: string,
  error: string
): RetryJobFromStageFailedAction => ({
  type: RETRY_JOB_FROM_STAGE_FAILED,
  payload: { jobId, error },
});
