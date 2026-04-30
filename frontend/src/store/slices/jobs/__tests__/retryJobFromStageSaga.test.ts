import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import {
  retryJobFromStageRequested,
  retryJobFromStageSucceeded,
  retryJobFromStageFailed,
} from "../actions";
import { retryJobFromStageSaga } from "../saga";
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

describe("retryJobFromStageSaga", () => {
  it("dispatches retryJobFromStageSucceeded on success (skipFailed=false)", async () => {
    mockedRequest.mockResolvedValueOnce({
      retryJobFromStage: { job: makeGqlJob(), errors: [] },
    });

    await expectSaga(
      retryJobFromStageSaga,
      retryJobFromStageRequested("job-1", "Summarizing", false)
    )
      .put(retryJobFromStageSucceeded(makeDomainJob()))
      .silentRun(20);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const callArg = mockedRequest.mock.calls[0][0] as {
      variables: { input: { skipFailed: boolean } };
    };
    expect(callArg.variables.input.skipFailed).toBe(false);
  });

  it("dispatches retryJobFromStageSucceeded on success (skipFailed=true)", async () => {
    mockedRequest.mockResolvedValueOnce({
      retryJobFromStage: { job: makeGqlJob(), errors: [] },
    });

    await expectSaga(retryJobFromStageSaga, retryJobFromStageRequested("job-1", "Correcting", true))
      .put(retryJobFromStageSucceeded(makeDomainJob()))
      .silentRun(20);

    const callArg = mockedRequest.mock.calls[0][0] as {
      variables: { input: { skipFailed: boolean } };
    };
    expect(callArg.variables.input.skipFailed).toBe(true);
  });

  it("dispatches retryJobFromStageFailed when mutation returns UserError", async () => {
    mockedRequest.mockResolvedValueOnce({
      retryJobFromStage: {
        job: null,
        errors: [{ code: "CONFLICT", message: "Job must be in terminal state" }],
      },
    });

    await expectSaga(
      retryJobFromStageSaga,
      retryJobFromStageRequested("job-1", "Transcribing", false)
    )
      .put(retryJobFromStageFailed("job-1", "Job must be in terminal state"))
      .silentRun(20);
  });

  it("dispatches retryJobFromStageFailed on transport error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("connection refused"));

    await expectSaga(
      retryJobFromStageSaga,
      retryJobFromStageRequested("job-1", "LlmCorrection", false)
    )
      .put(retryJobFromStageFailed("job-1", "connection refused"))
      .silentRun(20);
  });
});
