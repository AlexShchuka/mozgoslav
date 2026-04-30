import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import { pauseJobRequested, pauseJobSucceeded, pauseJobFailed } from "../actions";
import { pauseJobSaga } from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pauseJobSaga", () => {
  it("dispatches pauseJobSucceeded when mutation returns no errors", async () => {
    mockedRequest.mockResolvedValueOnce({ pauseJob: { errors: [] } });

    await expectSaga(pauseJobSaga, pauseJobRequested("job-1"))
      .put(pauseJobSucceeded("job-1"))
      .silentRun(20);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("dispatches pauseJobFailed when mutation returns UserError", async () => {
    mockedRequest.mockResolvedValueOnce({
      pauseJob: { errors: [{ code: "CONFLICT", message: "Job cannot be paused" }] },
    });

    await expectSaga(pauseJobSaga, pauseJobRequested("job-1"))
      .put(pauseJobFailed("job-1", "Job cannot be paused"))
      .silentRun(20);
  });

  it("dispatches pauseJobFailed on transport error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(pauseJobSaga, pauseJobRequested("job-1"))
      .put(pauseJobFailed("job-1", "network error"))
      .silentRun(20);
  });
});
