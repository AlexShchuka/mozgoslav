import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import { resumeJobRequested, resumeJobSucceeded, resumeJobFailed } from "../actions";
import { resumeJobSaga } from "../saga";
import type { ProcessingJob } from "../../../../domain";

const mockedRequest = graphqlClient.request as jest.Mock;

const makeGqlJob = (overrides: Record<string, unknown> = {}) => ({
  __typename: "ProcessingJob" as const,
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "QUEUED",
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

const makeDomainJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "Queued",
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("resumeJobSaga", () => {
  it("dispatches resumeJobSucceeded with the mapped job when mutation succeeds", async () => {
    mockedRequest.mockResolvedValueOnce({
      resumeJob: { job: makeGqlJob(), errors: [] },
    });

    await expectSaga(resumeJobSaga, resumeJobRequested("job-1"))
      .put(resumeJobSucceeded(makeDomainJob()))
      .silentRun(20);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("dispatches resumeJobFailed when mutation returns UserError", async () => {
    mockedRequest.mockResolvedValueOnce({
      resumeJob: {
        job: null,
        errors: [{ code: "CONFLICT", message: "Only paused jobs can be resumed" }],
      },
    });

    await expectSaga(resumeJobSaga, resumeJobRequested("job-1"))
      .put(resumeJobFailed("job-1", "Only paused jobs can be resumed"))
      .silentRun(20);
  });

  it("dispatches resumeJobFailed on transport error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(resumeJobSaga, resumeJobRequested("job-1"))
      .put(resumeJobFailed("job-1", "timeout"))
      .silentRun(20);
  });
});
