import { createSelector } from "reselect";

import type { ProcessingJob } from "../../../domain/ProcessingJob";
import type { ProcessingJobStage } from "../../../domain/ProcessingJobStage";
import type { GlobalState } from "../../rootReducer";
import type { JobsState, PendingJob } from "./types";

const TERMINAL_STATUSES = new Set(["Done", "Failed", "Cancelled"]);

const selectJobsState = (state: GlobalState): JobsState => state.jobs;

export const selectJobsById = createSelector(selectJobsState, (slice) => slice.byId);

export const selectStagesByJobId = createSelector(selectJobsState, (slice) => slice.stagesByJobId);

export const selectStagesForJob = (jobId: string) =>
  createSelector(
    selectStagesByJobId,
    (stagesByJobId): ProcessingJobStage[] => stagesByJobId[jobId] ?? []
  );

export const selectPendingJobs = createSelector(selectJobsState, (slice) =>
  Object.values(slice.pending)
);

export const selectAllJobs = createSelector(selectJobsById, (byId) => Object.values(byId));

export const selectActiveBackendJobs = createSelector(selectAllJobs, (jobs) =>
  jobs.filter((job) => !TERMINAL_STATUSES.has(job.status))
);

export const selectActiveJobs = createSelector(
  selectActiveBackendJobs,
  selectPendingJobs,
  (active, pending): (ProcessingJob | PendingJob)[] => [...pending, ...active]
);

export const selectJobsStreaming = createSelector(selectJobsState, (slice) => slice.isStreaming);

export const selectJobsSeedError = createSelector(selectJobsState, (slice) => slice.lastError);

export const selectJobById = (jobId: string) =>
  createSelector(selectJobsById, (byId) => byId[jobId] ?? null);

export const selectJobByRecordingId = (recordingId: string) =>
  createSelector(selectAllJobs, (jobs) => {
    for (let i = jobs.length - 1; i >= 0; i -= 1) {
      if (jobs[i].recordingId === recordingId) {
        return jobs[i];
      }
    }
    return null;
  });

export const selectJobsForRecording = (recordingId: string) =>
  createSelector(selectAllJobs, (jobs) => jobs.filter((j) => j.recordingId === recordingId));
