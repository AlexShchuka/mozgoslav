import { expectSaga } from "redux-saga-test-plan";
import { throwError } from "redux-saga-test-plan/providers";
import { loadRecordingsSaga } from "../src/store/slices/recording/saga";
import {
  loadRecordingsFailure,
  loadRecordingsSuccess,
  loadRecordingsUnavailable,
} from "../src/store/slices/recording/actions";
import type { Recording } from "../src/domain";

jest.mock("../src/api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../src/api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const fakeGqlRecording = {
  __typename: "Recording" as const,
  id: "r1",
  fileName: "a.m4a",
  filePath: "/tmp/a.m4a",
  sha256: "hash",
  duration: "PT1M",
  format: "M4A" as const,
  sourceType: "IMPORTED" as const,
  status: "TRANSCRIBED" as const,
  createdAt: "2026-04-16T12:00:00Z",
};

const sampleRecording: Recording = {
  id: "r1",
  fileName: "a.m4a",
  filePath: "/tmp/a.m4a",
  sha256: "hash",
  duration: "PT1M",
  format: "M4A",
  sourceType: "Imported",
  status: "Transcribed",
  createdAt: "2026-04-16T12:00:00Z",
};

describe("loadRecordingsSaga", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dispatches success with recordings from the GQL API", async () => {
    mockedRequest.mockResolvedValueOnce({
      recordings: { nodes: [fakeGqlRecording], totalCount: 1, pageInfo: { hasNextPage: false, hasPreviousPage: false } },
    });

    return expectSaga(loadRecordingsSaga)
      .put(loadRecordingsSuccess([sampleRecording]))
      .run();
  });

  it("dispatches backend-unavailable when the request fails with network error", async () => {
    const networkError = new Error("Failed to fetch");

    mockedRequest.mockRejectedValueOnce(networkError);

    return expectSaga(loadRecordingsSaga)
      .put(loadRecordingsUnavailable())
      .run();
  });

  it("dispatches failure on generic errors", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("boom"));

    return expectSaga(loadRecordingsSaga)
      .put(loadRecordingsFailure("boom"))
      .run();
  });
});
