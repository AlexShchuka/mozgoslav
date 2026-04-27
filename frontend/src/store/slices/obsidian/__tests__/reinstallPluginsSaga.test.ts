import { expectSaga } from "redux-saga-test-plan";

import { notifyError, notifySuccess } from "../../notifications";
import { fetchDiagnostics, reinstallPlugins, reinstallPluginsDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { reinstallPluginsSaga } from "../saga/reinstallPluginsSaga";

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

describe("reinstallPluginsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + fetchDiagnostics + REINSTALL_PLUGINS_DONE on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianReinstallPlugins: {
        reinstalled: ["obsidian-mozgoslav", "obsidian-bridge"],
        errors: [],
      },
    });

    const result = await expectSaga(reinstallPluginsSaga)
      .withReducer(obsidianReducer)
      .put(
        notifySuccess({
          messageKey: "obsidian.diagnostics.reinstallPluginsSuccess",
          params: { count: 2 },
        })
      )
      .put(fetchDiagnostics())
      .put(reinstallPluginsDone())
      .run();

    expect(result.storeState.isReinstallingPlugins).toBe(false);
  });

  it("emits notifyError + REINSTALL_PLUGINS_DONE on payload errors", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianReinstallPlugins: {
        reinstalled: [],
        errors: [{ code: "X", message: "permission denied" }],
      },
    });

    const result = await expectSaga(reinstallPluginsSaga)
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "permission denied" },
        })
      )
      .put(reinstallPluginsDone())
      .run();

    expect(result.storeState.isReinstallingPlugins).toBe(false);
  });

  it("emits notifyError + REINSTALL_PLUGINS_DONE on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("install failed"));

    const result = await expectSaga(reinstallPluginsSaga)
      .withReducer(obsidianReducer)
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "install failed" },
        })
      )
      .put(reinstallPluginsDone())
      .run();

    expect(result.storeState.isReinstallingPlugins).toBe(false);
  });

  it("reducer — REINSTALL_PLUGINS flips isReinstallingPlugins true", () => {
    const state = obsidianReducer(undefined, dispatch(reinstallPlugins()));
    expect(state.isReinstallingPlugins).toBe(true);
  });

  it("reducer — REINSTALL_PLUGINS_DONE flips isReinstallingPlugins false", () => {
    const progress = obsidianReducer(undefined, dispatch(reinstallPlugins()));
    const done = obsidianReducer(progress, dispatch(reinstallPluginsDone()));
    expect(done.isReinstallingPlugins).toBe(false);
  });
});
