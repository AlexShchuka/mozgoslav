import { expectSaga } from "redux-saga-test-plan";

import { notifySuccess, notifyWarning } from "../../notifications";
import { checkLlm, checkLlmDone } from "../actions";
import { checkLlmSaga } from "../saga/checkLlmSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const dispatch = (action: unknown) => action as Parameters<typeof settingsReducer>[1];

describe("checkLlmSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + CHECK_LLM_DONE on ok=true", async () => {
    mockedRequest.mockResolvedValueOnce({ llmHealth: { available: true } });

    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .put(notifySuccess({ messageKey: "settings.llmCheckSuccessToast" }))
      .put(checkLlmDone())
      .run();

    expect(result.storeState.llmProbe.probing).toBe(false);
  });

  it("emits notifyWarning + CHECK_LLM_DONE on ok=false", async () => {
    mockedRequest.mockResolvedValueOnce({ llmHealth: { available: false } });

    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .put(notifyWarning({ messageKey: "settings.llmCheckFailureToast" }))
      .put(checkLlmDone())
      .run();

    expect(result.storeState.llmProbe.probing).toBe(false);
  });

  it("emits notifyWarning + CHECK_LLM_DONE when API throws", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("down"));

    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .put(notifyWarning({ messageKey: "settings.llmCheckFailureToast" }))
      .put(checkLlmDone())
      .run();

    expect(result.storeState.llmProbe.probing).toBe(false);
  });

  it("reducer — CHECK_LLM flips probing to true", () => {
    const state = settingsReducer(undefined, dispatch(checkLlm()));
    expect(state.llmProbe.probing).toBe(true);
  });

  it("reducer — CHECK_LLM_DONE flips probing to false", () => {
    const probing = settingsReducer(undefined, dispatch(checkLlm()));
    const done = settingsReducer(probing, dispatch(checkLlmDone()));
    expect(done.llmProbe.probing).toBe(false);
  });
});
