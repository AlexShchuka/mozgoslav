import type { ProcessingJob } from "../domain/ProcessingJob";
import type { Recording } from "../domain/Recording";
import type { GlobalState } from "../store/rootReducer";
import { initialJobsState, type JobsState } from "../store/slices/jobs";
import { initialRecordingState, type RecordingState } from "../store/slices/recording";
import { initialUiState, type UiState } from "../store/slices/ui";

export const jobsById = (jobs: readonly ProcessingJob[]): Record<string, ProcessingJob> =>
  Object.fromEntries(jobs.map((job) => [job.id, job]));

export const mockJobsState = (patch: Partial<JobsState> = {}): Pick<GlobalState, "jobs"> => ({
  jobs: { ...initialJobsState, ...patch },
});

export const recordingsById = (recordings: readonly Recording[]): Record<string, Recording> =>
  Object.fromEntries(recordings.map((rec) => [rec.id, rec]));

export const mockRecordingState = (
  patch: Partial<RecordingState> = {}
): Pick<GlobalState, "recording"> => ({
  recording: { ...initialRecordingState, ...patch },
});

export const mockUiState = (patch: Partial<UiState> = {}): Pick<GlobalState, "ui"> => ({
  ui: { ...initialUiState, ...patch },
});

export const mergeMockState = (...parts: Partial<GlobalState>[]): Partial<GlobalState> =>
  Object.assign({}, ...parts);
