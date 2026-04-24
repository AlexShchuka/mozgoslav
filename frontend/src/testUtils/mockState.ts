import type { ProcessingJob } from "../domain/ProcessingJob";
import type { GlobalState } from "../store/rootReducer";
import { initialJobsState, type JobsState } from "../store/slices/jobs";

export const jobsById = (jobs: readonly ProcessingJob[]): Record<string, ProcessingJob> =>
  Object.fromEntries(jobs.map((job) => [job.id, job]));

export const mockJobsState = (patch: Partial<JobsState> = {}): Pick<GlobalState, "jobs"> => ({
  jobs: { ...initialJobsState, ...patch },
});
