import type { ProcessingJob } from "../../../../domain/ProcessingJob";
import {
  jobUpdated,
  jobsSeedFailed,
  jobsSeeded,
  jobsStreamClosed,
  jobsStreamOpened,
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
