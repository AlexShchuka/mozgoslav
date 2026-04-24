import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import { notifySuccess, notifyWarning } from "../../notifications";
import { checkLlm, checkLlmDone } from "../actions";
import { checkLlmSaga } from "../saga/checkLlmSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api", () => {
  const healthStub = { checkLlm: jest.fn() };
  return {
    apiFactory: { createHealthApi: () => healthStub },
    __healthStub: healthStub,
  };
});

const healthStub = (
  jest.requireMock("../../../../api") as { __healthStub: { checkLlm: jest.Mock } }
).__healthStub;

const dispatch = (action: unknown) => action as Parameters<typeof settingsReducer>[1];

describe("checkLlmSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + CHECK_LLM_DONE on ok=true", async () => {
    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .provide([[matchers.call.fn(healthStub.checkLlm), true]])
      .put(notifySuccess({ messageKey: "settings.llmCheckSuccessToast" }))
      .put(checkLlmDone())
      .run();

    expect(result.storeState.llmProbe.probing).toBe(false);
  });

  it("emits notifyWarning + CHECK_LLM_DONE on ok=false", async () => {
    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .provide([[matchers.call.fn(healthStub.checkLlm), false]])
      .put(notifyWarning({ messageKey: "settings.llmCheckFailureToast" }))
      .put(checkLlmDone())
      .run();

    expect(result.storeState.llmProbe.probing).toBe(false);
  });

  it("emits notifyWarning + CHECK_LLM_DONE when API throws", async () => {
    const result = await expectSaga(checkLlmSaga)
      .withReducer(settingsReducer)
      .provide([[matchers.call.fn(healthStub.checkLlm), throwError(new Error("down"))]])
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
