import type { ProcessingJob } from "../../../domain/ProcessingJob";
import type { ProcessingJobStage } from "../../../domain/ProcessingJobStage";
import type { JobsState, PendingJob } from "./types";

type JobWithStages = ProcessingJob & { stages?: ProcessingJobStage[] };

export const seedJobs = (state: JobsState, jobs: JobWithStages[]): JobsState => {
  const byId = jobs.reduce<Record<string, ProcessingJob>>((acc, job) => {
    const { stages: _stages, ...jobCore } = job;
    acc[job.id] = jobCore;
    return acc;
  }, {});
  const stagesByJobId = jobs.reduce<Record<string, ProcessingJobStage[]>>((acc, job) => {
    acc[job.id] = job.stages ?? [];
    return acc;
  }, {});
  return {
    ...state,
    byId,
    stagesByJobId: { ...state.stagesByJobId, ...stagesByJobId },
    lastError: null,
  };
};

export const upsertJob = (state: JobsState, job: JobWithStages): JobsState => {
  const { stages, ...jobCore } = job;
  const nextPending = { ...state.pending };
  for (const [tempId, pending] of Object.entries(state.pending)) {
    if (pending.recordingId && pending.recordingId === jobCore.recordingId) {
      delete nextPending[tempId];
    }
  }
  const nextStagesByJobId =
    stages !== undefined ? { ...state.stagesByJobId, [jobCore.id]: stages } : state.stagesByJobId;
  return {
    ...state,
    byId: { ...state.byId, [jobCore.id]: jobCore },
    stagesByJobId: nextStagesByJobId,
    pending: nextPending,
  };
};

export const setSeedError = (state: JobsState, error: string): JobsState => ({
  ...state,
  lastError: error,
});

export const setStreaming = (state: JobsState, isStreaming: boolean): JobsState => ({
  ...state,
  isStreaming,
});

export const addPending = (state: JobsState, pending: PendingJob): JobsState => ({
  ...state,
  pending: { ...state.pending, [pending.tempId]: pending },
});

export const resolvePending = (
  state: JobsState,
  tempId: string,
  recordingId?: string
): JobsState => {
  const existing = state.pending[tempId];
  if (!existing) {
    return state;
  }
  return {
    ...state,
    pending: { ...state.pending, [tempId]: { ...existing, recordingId } },
  };
};

export const failPending = (state: JobsState, tempId: string, error: string): JobsState => {
  const existing = state.pending[tempId];
  if (!existing) {
    return state;
  }
  return {
    ...state,
    pending: { ...state.pending, [tempId]: { ...existing, error } },
  };
};
