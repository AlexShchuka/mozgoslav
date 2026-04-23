import type { ProcessingJob } from "../../../../domain/ProcessingJob";
import type { GlobalState } from "../../../rootReducer";
import {
  selectActiveJobs,
  selectAllJobs,
  selectJobById,
  selectJobByRecordingId,
  selectPendingJobs,
} from "../selectors";
import type { JobsState, PendingJob } from "../types";

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
  startedAt: null,
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

const makeState = (jobs: JobsState): GlobalState => ({ jobs }) as unknown as GlobalState;

describe("jobs selectors", () => {
  it("selectAllJobs returns array view of byId", () => {
    const state = makeState({
      byId: { a: makeJob({ id: "a" }), b: makeJob({ id: "b" }) },
      pending: {},
      isStreaming: true,
      lastError: null,
    });
    expect(selectAllJobs(state).map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("selectActiveJobs filters out terminal statuses, prepends pending", () => {
    const state = makeState({
      byId: {
        a: makeJob({ id: "a", status: "Transcribing" }),
        b: makeJob({ id: "b", status: "Done" }),
        c: makeJob({ id: "c", status: "Failed" }),
        d: makeJob({ id: "d", status: "Cancelled" }),
        e: makeJob({ id: "e", status: "Queued" }),
      },
      pending: { p: makePending({ tempId: "p" }) },
      isStreaming: true,
      lastError: null,
    });
    const active = selectActiveJobs(state);
    const ids = active.map((x) => ("id" in x ? x.id : x.tempId));
    expect(ids).toEqual(["p", "a", "e"]);
  });

  it("selectJobById returns the job or null", () => {
    const state = makeState({
      byId: { a: makeJob({ id: "a" }) },
      pending: {},
      isStreaming: false,
      lastError: null,
    });
    expect(selectJobById("a")(state)).toBeTruthy();
    expect(selectJobById("missing")(state)).toBeNull();
  });

  it("selectJobByRecordingId returns the most recently inserted job for that recording", () => {
    const state = makeState({
      byId: {
        a: makeJob({ id: "a", recordingId: "rec-1" }),
        b: makeJob({ id: "b", recordingId: "rec-1" }),
        c: makeJob({ id: "c", recordingId: "rec-other" }),
      },
      pending: {},
      isStreaming: false,
      lastError: null,
    });
    const job = selectJobByRecordingId("rec-1")(state);
    expect(job?.id).toBe("b");
  });

  it("selectPendingJobs returns pending values", () => {
    const state = makeState({
      byId: {},
      pending: { p1: makePending({ tempId: "p1" }), p2: makePending({ tempId: "p2" }) },
      isStreaming: false,
      lastError: null,
    });
    expect(
      selectPendingJobs(state)
        .map((p) => p.tempId)
        .sort()
    ).toEqual(["p1", "p2"]);
  });
});
