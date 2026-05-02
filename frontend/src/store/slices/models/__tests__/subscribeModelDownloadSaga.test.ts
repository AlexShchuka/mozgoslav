import { channel } from "redux-saga";
import { expectSaga } from "redux-saga-test-plan";

import { DownloadState } from "../../../../api/gql/graphql";
import {
  modelDownloadProgress,
  modelDownloadCompleted,
  loadModels,
  SUBSCRIBE_MODEL_DOWNLOAD,
  UNSUBSCRIBE_MODEL_DOWNLOAD,
} from "../actions";
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

describe("subscribeModelDownloadSaga — TC-F03", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("TC-F03a: DOWNLOADING phase dispatches modelDownloadProgress", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    setImmediate(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      setImmediate(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Downloading, 512, 1024));
        setImmediate(() => {
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

  it("TC-F03b: SUCCESS (Completed) phase dispatches modelDownloadCompleted + loadModels", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    setImmediate(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      setImmediate(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Completed, 1024, 1024));
      });
    });

    await saga
      .put(modelDownloadCompleted("dl-test"))
      .put(loadModels())
      .run({ timeout: 500, silenceTimeout: true });
  });

  it("TC-F03c: FAILED phase dispatches modelDownloadCompleted + loadModels", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    setImmediate(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      setImmediate(() => {
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

    await saga
      .put(modelDownloadCompleted("dl-test"))
      .put(loadModels())
      .run({ timeout: 500, silenceTimeout: true });
  });

  it("TC-F03d: CANCELLED phase dispatches modelDownloadCompleted + loadModels", async () => {
    const mockChannel = channel();
    mockGqlSubscriptionChannel.mockReturnValue(mockChannel);

    const saga = expectSaga(watchSubscribeModelDownload);

    setImmediate(() => {
      saga.dispatch({
        type: SUBSCRIBE_MODEL_DOWNLOAD,
        payload: { downloadId: "dl-test" },
      });

      setImmediate(() => {
        mockChannel.put(makeSubscriptionEvent(DownloadState.Cancelled, 0, 1024));
      });
    });

    await saga
      .put(modelDownloadCompleted("dl-test"))
      .put(loadModels())
      .run({ timeout: 500, silenceTimeout: true });
  });
});
