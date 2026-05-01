import type { ProcessingJob } from "../../../../domain/ProcessingJob";
import type { ProcessingJobStage } from "../../../../domain/ProcessingJobStage";
import {
  jobUpdated,
  jobsSeedFailed,
  jobsSeeded,
  jobsStreamClosed,
  jobsStreamOpened,
  pauseJobFailed,
  pauseJobSucceeded,
  pendingJobCreated,
  pendingJobFailed,
  pendingJobResolved,
} from "../actions";
import { jobsReducer } from "../reducer";
import { initialJobsState, type PendingJob } from "../types";

const dispatch = (action: unknown): Parameters<typeof jobsReducer>[1] =>
  action as Parameters<typeof jobsReducer>[1];

const makeJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "Transcribing",
  progress: 25,
  currentStep: "Transcribing audio",
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: "2026-04-19T20:00:01Z",
  finishedAt: null,
  ...overrides,
});

const makePending = (overrides: Partial<PendingJob> = {}): PendingJob => ({
  tempId: "tmp-1",
  kind: "uploading",
  label: "uploading…",
  startedAt: "2026-04-19T20:00:00Z",
  ...overrides,
});

describe("jobs reducer", () => {
  it("seeds jobs by id", () => {
    const next = jobsReducer(
      initialJobsState,
      dispatch(jobsSeeded([makeJob({ id: "a" }), makeJob({ id: "b" })]))
    );
    expect(Object.keys(next.byId)).toEqual(["a", "b"]);
    expect(next.lastError).toBeNull();
  });

  it("records seed error without clearing existing jobs", () => {
    const seeded = jobsReducer(initialJobsState, dispatch(jobsSeeded([makeJob({ id: "a" })])));
    const next = jobsReducer(seeded, dispatch(jobsSeedFailed("network down")));
    expect(next.byId).toHaveProperty("a");
    expect(next.lastError).toBe("network down");
  });

  it("upserts a job by id", () => {
    const seeded = jobsReducer(
      initialJobsState,
      dispatch(jobsSeeded([makeJob({ id: "a", progress: 10 })]))
    );
    const next = jobsReducer(seeded, dispatch(jobUpdated(makeJob({ id: "a", progress: 80 }))));
    expect(next.byId.a.progress).toBe(80);
  });

  it("clears matching pending entry when a real job for the same recording arrives", () => {
    const withPending = jobsReducer(
      initialJobsState,
      dispatch(pendingJobCreated(makePending({ tempId: "tmp-1", recordingId: "rec-1" })))
    );
    const resolved = jobsReducer(
      withPending,
      dispatch(pendingJobResolved({ tempId: "tmp-1", recordingId: "rec-1" }))
    );
    expect(resolved.pending["tmp-1"].recordingId).toBe("rec-1");
    const next = jobsReducer(resolved, dispatch(jobUpdated(makeJob({ recordingId: "rec-1" }))));
    expect(next.pending["tmp-1"]).toBeUndefined();
    expect(next.byId["job-1"]).toBeDefined();
  });

  it("toggles streaming flag", () => {
    const opened = jobsReducer(initialJobsState, dispatch(jobsStreamOpened()));
    expect(opened.isStreaming).toBe(true);
    const closed = jobsReducer(opened, dispatch(jobsStreamClosed()));
    expect(closed.isStreaming).toBe(false);
  });

  it("adds, resolves, and fails pending jobs", () => {
    const created = jobsReducer(initialJobsState, dispatch(pendingJobCreated(makePending())));
    expect(created.pending["tmp-1"]).toBeDefined();
    const resolved = jobsReducer(
      created,
      dispatch(pendingJobResolved({ tempId: "tmp-1", recordingId: "rec-1" }))
    );
    expect(resolved.pending["tmp-1"].recordingId).toBe("rec-1");
    const failed = jobsReducer(
      resolved,
      dispatch(pendingJobFailed({ tempId: "tmp-1", error: "boom" }))
    );
    expect(failed.pending["tmp-1"].error).toBe("boom");
  });

  it("ignores resolve/fail for unknown tempId", () => {
    const next = jobsReducer(initialJobsState, dispatch(pendingJobResolved({ tempId: "missing" })));
    expect(next).toEqual(initialJobsState);
  });
});

const makeStage = (overrides: Partial<ProcessingJobStage> = {}): ProcessingJobStage => ({
  id: "stage-1",
  jobId: "job-1",
  stageName: "Transcribing",
  startedAt: "2026-04-19T20:00:01Z",
  finishedAt: null,
  durationMs: null,
  errorMessage: null,
  ...overrides,
});

describe("jobs reducer — stagesByJobId", () => {
  it("JOBS_SEEDED populates stagesByJobId from job stages", () => {
    const stage = makeStage();
    const jobWithStages = {
      ...makeJob({ id: "job-1" }),
      stages: [stage],
    } as unknown as ProcessingJob;
    const next = jobsReducer(initialJobsState, dispatch(jobsSeeded([jobWithStages])));
    expect(next.stagesByJobId["job-1"]).toHaveLength(1);
    expect(next.stagesByJobId["job-1"][0].stageName).toBe("Transcribing");
  });

  it("JOBS_SEEDED with empty stages array sets stagesByJobId entry to []", () => {
    const jobWithStages = { ...makeJob({ id: "job-1" }), stages: [] } as unknown as ProcessingJob;
    const next = jobsReducer(initialJobsState, dispatch(jobsSeeded([jobWithStages])));
    expect(next.stagesByJobId["job-1"]).toEqual([]);
  });

  it("JOB_UPDATED replaces one job's stages atomically — not merged", () => {
    const initial = makeStage({ id: "old-stage", stageName: "Correcting" });
    const seeded = jobsReducer(
      initialJobsState,
      dispatch(
        jobsSeeded([{ ...makeJob({ id: "job-1" }), stages: [initial] } as unknown as ProcessingJob])
      )
    );
    expect(seeded.stagesByJobId["job-1"]).toHaveLength(1);

    const updatedStages = [
      makeStage({ id: "s-1", stageName: "Transcribing" }),
      makeStage({ id: "s-2", stageName: "Correcting" }),
    ];
    const next = jobsReducer(
      seeded,
      dispatch(
        jobUpdated({
          ...makeJob({ id: "job-1", progress: 50 }),
          stages: updatedStages,
        } as unknown as ProcessingJob)
      )
    );
    expect(next.stagesByJobId["job-1"]).toHaveLength(2);
    expect(next.stagesByJobId["job-1"][0].id).toBe("s-1");
    expect(next.stagesByJobId["job-1"][1].id).toBe("s-2");
  });
});

describe("jobs reducer — PAUSE_JOB", () => {
  it("PAUSE_JOB_SUCCEEDED sets job status to Paused and clears error", () => {
    const seeded = jobsReducer(
      { ...initialJobsState, errors: { "job-1": "prev-error" } },
      dispatch(jobsSeeded([makeJob({ id: "job-1", status: "Transcribing" })]))
    );
    const next = jobsReducer(seeded, dispatch(pauseJobSucceeded("job-1")));
    expect(next.byId["job-1"].status).toBe("Paused");
    expect(next.errors["job-1"]).toBeUndefined();
  });

  it("PAUSE_JOB_SUCCEEDED is a no-op for unknown jobId", () => {
    const state = jobsReducer(initialJobsState, dispatch(pauseJobSucceeded("unknown")));
    expect(state.byId).toEqual({});
  });

  it("PAUSE_JOB_FAILED stores error keyed by jobId", () => {
    const next = jobsReducer(
      initialJobsState,
      dispatch(pauseJobFailed("job-1", "Job cannot be paused"))
    );
    expect(next.errors["job-1"]).toBe("Job cannot be paused");
  });

  it("PAUSE_JOB_FAILED does not overwrite other job errors", () => {
    const withError = { ...initialJobsState, errors: { "job-2": "job-2-error" } };
    const next = jobsReducer(withError, dispatch(pauseJobFailed("job-1", "pause failed")));
    expect(next.errors["job-2"]).toBe("job-2-error");
    expect(next.errors["job-1"]).toBe("pause failed");
  });
});
