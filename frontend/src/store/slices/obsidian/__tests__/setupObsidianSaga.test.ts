import { expectSaga } from "redux-saga-test-plan";

import { notifyError, notifySuccess } from "../../notifications";
import { setupObsidian, setupObsidianDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { setupObsidianSaga } from "../saga/setupObsidianSaga";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("setupObsidianSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + SETUP_OBSIDIAN_DONE on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      setupObsidian: {
        errors: [],
        report: { createdPaths: ["/a", "/b", "/c"] },
      },
    });

    const result = await expectSaga(setupObsidianSaga, setupObsidian("/tmp/vault"))
      .withReducer(obsidianReducer)
      .put(
        notifySuccess({
          messageKey: "obsidian.setupSuccess",
          params: { created: 3 },
        })
      )
      .put(setupObsidianDone())
      .run();

    expect(result.storeState.isSetupInProgress).toBe(false);
  });

  it("emits notifyError + SETUP_OBSIDIAN_DONE on API error in payload", async () => {
    mockedRequest.mockResolvedValueOnce({
      setupObsidian: {
        errors: [{ message: "vault not found" }],
        report: null,
      },
    });

    const result = await expectSaga(setupObsidianSaga, setupObsidian("/tmp/vault"))
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "vault not found" },
        })
      )
      .put(setupObsidianDone())
      .run();

    expect(result.storeState.isSetupInProgress).toBe(false);
  });

  it("emits notifyError + SETUP_OBSIDIAN_DONE on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("nope"));

    const result = await expectSaga(setupObsidianSaga, setupObsidian("/tmp/vault"))
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "nope" },
        })
      )
      .put(setupObsidianDone())
      .run();

    expect(result.storeState.isSetupInProgress).toBe(false);
  });

  it("reducer — SETUP_OBSIDIAN flips isSetupInProgress true", () => {
    const state = obsidianReducer(undefined, dispatch(setupObsidian("/v")));
    expect(state.isSetupInProgress).toBe(true);
  });

  it("reducer — SETUP_OBSIDIAN_DONE flips isSetupInProgress false", () => {
    const progress = obsidianReducer(undefined, dispatch(setupObsidian("/v")));
    const done = obsidianReducer(progress, dispatch(setupObsidianDone()));
    expect(done.isSetupInProgress).toBe(false);
  });
});
