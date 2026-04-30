import type { Reducer } from "redux";

import {
  JOBS_SEEDED,
  JOBS_SEED_FAILED,
  JOBS_STREAM_CLOSED,
  JOBS_STREAM_OPENED,
  JOB_UPDATED,
  PENDING_JOB_CREATED,
  PENDING_JOB_FAILED,
  PENDING_JOB_RESOLVED,
  RESUME_JOB_SUCCEEDED,
  RETRY_JOB_FROM_STAGE_SUCCEEDED,
  type JobsAction,
} from "./actions";
import {
  addPending,
  failPending,
  resolvePending,
  seedJobs,
  setSeedError,
  setStreaming,
  upsertJob,
} from "./mutations";
import { initialJobsState, type JobsState } from "./types";

export const jobsReducer: Reducer<JobsState> = (
  state: JobsState = initialJobsState,
  action
): JobsState => {
  const typed = action as JobsAction;
  switch (typed.type) {
    case JOBS_SEEDED:
      return seedJobs(state, typed.payload);
    case JOBS_SEED_FAILED:
      return setSeedError(state, typed.payload);
    case JOB_UPDATED:
      return upsertJob(state, typed.payload);
    case JOBS_STREAM_OPENED:
      return setStreaming(state, true);
    case JOBS_STREAM_CLOSED:
      return setStreaming(state, false);
    case PENDING_JOB_CREATED:
      return addPending(state, typed.payload);
    case PENDING_JOB_RESOLVED:
      return resolvePending(state, typed.payload.tempId, typed.payload.recordingId);
    case PENDING_JOB_FAILED:
      return failPending(state, typed.payload.tempId, typed.payload.error);
    case RESUME_JOB_SUCCEEDED:
      return upsertJob(
        state,
        (typed as { payload: { job: Parameters<typeof upsertJob>[1] } }).payload.job
      );
    case RETRY_JOB_FROM_STAGE_SUCCEEDED:
      return upsertJob(
        state,
        (typed as { payload: { job: Parameters<typeof upsertJob>[1] } }).payload.job
      );
    default:
      return state;
  }
};
