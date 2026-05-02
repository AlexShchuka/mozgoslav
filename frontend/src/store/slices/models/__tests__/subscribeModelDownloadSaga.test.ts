import { channel } from "redux-saga";
import { expectSaga } from "redux-saga-test-plan";

import { DownloadState } from "../../../../api/gql/graphql";
import {
  modelDownloadProgress,
  loadModels,
  SUBSCRIBE_MODEL_DOWNLOAD,
  UNSUBSCRIBE_MODEL_DOWNLOAD,
} from "../actions";
import { notifySuccess } from "../../notifications";
import { watchSubscribeModelDownload } from "../saga/subscribeModelDownloadSaga";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(),
  })),
}));

jest.mock("../../../../store/saga/graphql", () => ({
  gqlRequest: jest.fn(),
  gqlSubscriptionChannel: jest.fn(),
}));

import { gqlSubscriptionChannel } from "../../../../store/saga/graphql";
const mockGqlSubscriptionChannel = gqlSubscriptionChannel as jest.Mock;

const makeSubscriptionEvent = (phase: DownloadState, bytesRead = 0, totalBytes = 1024) => ({
  modelDownloadProgress: {
    downloadId: "dl-test",
    phase,
    bytesRead,
    totalBytes,
    speedBytesPerSecond: null,
    error: null,
  },
});

const tick = (fn: () => void) => setTimeout(fn, 0);

describe("subscribeModelDownloadSaga — TC-F03", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("TC-F03a: DOWNLOADING phase dispatches modelDownloadProgress", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    tick(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      tick(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Downloading, 512, 1024));
        tick(() => {
          saga.dispatch({ type: UNSUBSCRIBE_MODEL_DOWNLOAD, payload: { downloadId: "dl-test" } });
        });
      });
    });

    await saga
      .put(
        modelDownloadProgress({
          downloadId: "dl-test",
          bytesRead: 512,
          totalBytes: 1024,
          phase: DownloadState.Downloading,
          speedBytesPerSecond: null,
          error: null,
        })
      )
      .run({ timeout: 500, silenceTimeout: true });
  });

  it("TC-F03b: SUCCESS (Completed) phase dispatches loadModels and (after linger) modelDownloadCompleted", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    tick(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      tick(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Completed, 1024, 1024));
      });
    });

    await saga.put(loadModels()).run({ timeout: 500, silenceTimeout: true });
  });

  it("TC-F03c: FAILED phase dispatches loadModels and DOES NOT auto-remove", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    tick(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      tick(() => {
        mockChannel.put({
          modelDownloadProgress: {
            downloadId: "dl-test",
            phase: DownloadState.Failed,
            bytesRead: 0,
            totalBytes: 1024,
            speedBytesPerSecond: null,
            error: "Network error",
          },
        });
      });
    });

    const { effects } = await saga
      .put(loadModels())
      .run({ timeout: 500, silenceTimeout: true });

    const completedDispatched = effects.put?.some(
      (e) =>
        (e.payload?.action as { type?: string } | undefined)?.type ===
        "models/MODEL_DOWNLOAD_COMPLETED"
    );
    expect(completedDispatched).toBeFalsy();
  });

  it("TC-F03d: CANCELLED phase dispatches loadModels + notifySuccess (linger before modelDownloadCompleted)", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    tick(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      tick(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Cancelled, 0, 1024));
      });
    });

    await saga
      .put(loadModels())
      .put(notifySuccess({ messageKey: "downloads.cancelledToast" }))
      .run({ timeout: 500, silenceTimeout: true });
  });
});
