import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import { MutationDictationCancelDocument } from "../../../../api/gql/graphql";
import { notifyError } from "../../notifications";
import { dictationCancelFailed, dictationCancelled } from "../actions";
import { watchDictationCancel } from "../saga/dictationCancelSaga";
import { DICTATION_CANCEL_REQUESTED } from "../actions";

const mockedRequest = graphqlClient.request as jest.Mock;

const cancellingState = {
  dictation: { status: { phase: "cancelling", sessionId: "s1", persistOnStop: false } },
};

const idleState = {
  dictation: { status: { phase: "idle" } },
};

beforeEach(() => jest.clearAllMocks());

describe("dictationCancelSaga", () => {
  it("Happy_Path_DispatchesCancelled", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationCancel: { errors: [] },
    });

    await expectSaga(watchDictationCancel)
      .withState(cancellingState)
      .put(dictationCancelled())
      .dispatch({ type: DICTATION_CANCEL_REQUESTED })
      .silentRun(50);

    expect(mockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({ document: MutationDictationCancelDocument })
    );
  });

  it("ServerErrors_DispatchesCancelFailed_AndNotify", async () => {
    mockedRequest.mockResolvedValueOnce({
      dictationCancel: { errors: [{ code: "SERVER_ERROR", message: "something blew up" }] },
    });

    await expectSaga(watchDictationCancel)
      .withState(cancellingState)
      .put(dictationCancelFailed({ error: "something blew up" }))
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "something blew up" },
        })
      )
      .dispatch({ type: DICTATION_CANCEL_REQUESTED })
      .silentRun(50);
  });

  it("Throws_DispatchesCancelFailed_AndNotify", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(watchDictationCancel)
      .withState(cancellingState)
      .put(dictationCancelFailed({ error: "network error" }))
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "network error" },
        })
      )
      .dispatch({ type: DICTATION_CANCEL_REQUESTED })
      .silentRun(50);
  });

  it("WrongPhase_NoOp_WhenIdle", async () => {
    await expectSaga(watchDictationCancel)
      .withState(idleState)
      .dispatch({ type: DICTATION_CANCEL_REQUESTED })
      .silentRun(50);

    expect(mockedRequest).not.toHaveBeenCalled();
  });
});
