import { expectSaga } from "redux-saga-test-plan";

import { cancelModelDownloadSuccess, cancelModelDownloadFailure } from "../actions";
import { cancelModelDownloadSaga } from "../saga/cancelModelDownloadSaga";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

jest.mock("../../../../store/slices/notifications", () => ({
  notifyError: jest.fn(() => ({ type: "notifications/NOTIFY_ERROR", payload: {} })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const makeAction = (downloadId: string) => ({
  type: "models/CANCEL_MODEL_DOWNLOAD_REQUESTED" as const,
  payload: downloadId,
});

describe("cancelModelDownloadSaga — TC-F13..F15", () => {
  beforeEach(() => jest.clearAllMocks());

  it("TC-F13: puts cancelModelDownloadSuccess on ok=true", async () => {
    mockedRequest.mockResolvedValueOnce({
      cancelModelDownload: { ok: true, errors: [] },
    });

    await expectSaga(cancelModelDownloadSaga, makeAction("dl-xyz"))
      .put(cancelModelDownloadSuccess("dl-xyz"))
      .run();
  });

  it("TC-F14: puts cancelModelDownloadFailure when ok=false", async () => {
    mockedRequest.mockResolvedValueOnce({
      cancelModelDownload: {
        ok: false,
        errors: [{ code: "CANNOT_CANCEL_FINALIZING", message: "Cannot cancel" }],
      },
    });

    await expectSaga(cancelModelDownloadSaga, makeAction("dl-xyz"))
      .put(cancelModelDownloadFailure({ downloadId: "dl-xyz", error: "Cannot cancel" }))
      .run();
  });

  it("TC-F15: puts cancelModelDownloadFailure on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(cancelModelDownloadSaga, makeAction("dl-xyz"))
      .put(cancelModelDownloadFailure({ downloadId: "dl-xyz", error: "timeout" }))
      .run();
  });
});
