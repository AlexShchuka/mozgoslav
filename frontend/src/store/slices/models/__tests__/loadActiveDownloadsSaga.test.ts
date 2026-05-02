import { expectSaga } from "redux-saga-test-plan";

import { DownloadState } from "../../../../api/gql/graphql";
import { loadActiveDownloadsSuccess, loadActiveDownloadsFailure } from "../actions";
import { loadActiveDownloadsSaga } from "../saga/loadActiveDownloadsSaga";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

describe("loadActiveDownloadsSaga — TC-F11..F12", () => {
  beforeEach(() => jest.clearAllMocks());

  it("TC-F11: puts loadActiveDownloadsSuccess with mapped downloads on happy path", async () => {
    const raw = [
      {
        __typename: "ActiveDownloadDto",
        id: "dl-1",
        catalogueId: "cat-1",
        state: DownloadState.Downloading,
        bytesReceived: 1024,
        totalBytes: 2048,
        speedBytesPerSecond: 50000,
        errorMessage: null,
        startedAt: "2026-05-01T00:00:00Z",
      },
    ];
    mockedRequest.mockResolvedValueOnce({ activeDownloads: raw });

    await expectSaga(loadActiveDownloadsSaga)
      .put(
        loadActiveDownloadsSuccess([
          {
            id: "dl-1",
            catalogueId: "cat-1",
            state: DownloadState.Downloading,
            bytesReceived: 1024,
            totalBytes: 2048,
            speedBytesPerSecond: 50000,
            errorMessage: null,
            startedAt: "2026-05-01T00:00:00Z",
          },
        ])
      )
      .run();
  });

  it("TC-F12: puts loadActiveDownloadsFailure on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadActiveDownloadsSaga)
      .put(loadActiveDownloadsFailure("network error"))
      .run();
  });
});
