import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import {
  DICTATION_START_REQUESTED,
  DICTATION_STARTED,
  DICTATION_FAILED,
  dictationStarted,
  dictationFailed,
  dictationStartRequested,
} from "../actions";
import { watchDictationStart } from "../saga/dictationStartSaga";

const mockedRequest = graphqlClient.request as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("dictationStartSaga — hotkey source variants", () => {
  it("HotkeyMouse_HappyPath_DispatchesStarted", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: "session-mouse-1", errors: [] },
    });

    await expectSaga(watchDictationStart)
      .put(dictationStarted({ sessionId: "session-mouse-1" }))
      .dispatch(dictationStartRequested({ source: "mouse", persistOnStop: false }))
      .silentRun(50);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("HotkeyKeyboard_HappyPath_DispatchesStarted", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: "session-kb-1", errors: [] },
    });

    await expectSaga(watchDictationStart)
      .put(dictationStarted({ sessionId: "session-kb-1" }))
      .dispatch(dictationStartRequested({ source: "keyboard", persistOnStop: false }))
      .silentRun(50);
  });

  it("NullSessionId_DispatchesFailed", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: null, errors: [] },
    });

    await expectSaga(watchDictationStart)
      .put(dictationFailed({ error: "dictation start failed" }))
      .dispatch(dictationStartRequested({ source: "mouse", persistOnStop: false }))
      .silentRun(50);
  });

  it("NullSessionId_DoesNotDispatchStarted", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: null, errors: [] },
    });

    const result = await expectSaga(watchDictationStart)
      .dispatch(dictationStartRequested({ source: "mouse", persistOnStop: false }))
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const startedPut = puts.find(
      (p: { payload: { action: { type: string } } }) => p.payload.action.type === DICTATION_STARTED
    );
    expect(startedPut).toBeUndefined();
  });

  it("NetworkError_DispatchesFailed_WithMessage", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("connection failed"));

    await expectSaga(watchDictationStart)
      .put(dictationFailed({ error: "connection failed" }))
      .dispatch(dictationStartRequested({ source: "mouse", persistOnStop: false }))
      .silentRun(50);
  });

  it("NetworkError_DoesNotDispatchStarted", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    const result = await expectSaga(watchDictationStart)
      .dispatch(dictationStartRequested({ source: "keyboard", persistOnStop: true }))
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const startedPut = puts.find(
      (p: { payload: { action: { type: string } } }) => p.payload.action.type === DICTATION_STARTED
    );
    expect(startedPut).toBeUndefined();
  });

  it("PersistOnStop_True_PassedInPayload_DispatchesStarted", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationStart: { sessionId: "session-persist-1", errors: [] },
    });

    await expectSaga(watchDictationStart)
      .put(dictationStarted({ sessionId: "session-persist-1" }))
      .dispatch(dictationStartRequested({ source: "mouse", persistOnStop: true }))
      .silentRun(50);
  });
});

describe("dictationStartSaga — action type constants", () => {
  it("DICTATION_START_REQUESTED constant matches expected value", () => {
    expect(DICTATION_START_REQUESTED).toBe("dictation/START_REQUESTED");
  });

  it("DICTATION_FAILED constant matches expected value", () => {
    expect(DICTATION_FAILED).toBe("dictation/FAILED");
  });
});
