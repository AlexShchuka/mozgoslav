import { expectSaga } from "redux-saga-test-plan";

import { notifyError, notifySuccess } from "../../notifications";
import { fetchDiagnostics, reapplyBootstrap, reapplyBootstrapDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { reapplyBootstrapSaga } from "../saga/reapplyBootstrapSaga";

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

describe("reapplyBootstrapSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + fetchDiagnostics + REAPPLY_BOOTSTRAP_DONE on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianReapplyBootstrap: {
        overwritten: ["a.md"],
        skipped: [],
        backedUpTo: "/tmp/backup",
        errors: [],
      },
    });

    const result = await expectSaga(reapplyBootstrapSaga)
      .withReducer(obsidianReducer)
      .put(notifySuccess({ messageKey: "obsidian.diagnostics.reapplyBootstrapSuccess" }))
      .put(fetchDiagnostics())
      .put(reapplyBootstrapDone())
      .run();

    expect(result.storeState.isReapplyingBootstrap).toBe(false);
  });

  it("emits notifyError + REAPPLY_BOOTSTRAP_DONE on payload errors", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianReapplyBootstrap: {
        overwritten: [],
        skipped: [],
        backedUpTo: null,
        errors: [{ code: "X", message: "vault locked" }],
      },
    });

    const result = await expectSaga(reapplyBootstrapSaga)
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "vault locked" },
        })
      )
      .put(reapplyBootstrapDone())
      .run();

    expect(result.storeState.isReapplyingBootstrap).toBe(false);
  });

  it("emits notifyError + REAPPLY_BOOTSTRAP_DONE on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("bootstrap failed"));

    const result = await expectSaga(reapplyBootstrapSaga)
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "bootstrap failed" },
        })
      )
      .put(reapplyBootstrapDone())
      .run();

    expect(result.storeState.isReapplyingBootstrap).toBe(false);
  });

  it("reducer — REAPPLY_BOOTSTRAP flips isReapplyingBootstrap true", () => {
    const state = obsidianReducer(undefined, dispatch(reapplyBootstrap()));
    expect(state.isReapplyingBootstrap).toBe(true);
  });

  it("reducer — REAPPLY_BOOTSTRAP_DONE flips isReapplyingBootstrap false", () => {
    const progress = obsidianReducer(undefined, dispatch(reapplyBootstrap()));
    const done = obsidianReducer(progress, dispatch(reapplyBootstrapDone()));
    expect(done.isReapplyingBootstrap).toBe(false);
  });
});
