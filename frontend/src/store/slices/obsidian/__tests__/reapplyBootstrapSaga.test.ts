import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import { notifyError, notifySuccess } from "../../notifications";
import { reapplyBootstrap, reapplyBootstrapDone, fetchDiagnosticsDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { reapplyBootstrapSaga } from "../saga/reapplyBootstrapSaga";
import type { ObsidianReapplyResult, VaultDiagnosticsReport } from "../apiTypes";

jest.mock("../../../../api", () => {
  const obsidianStub = {
    diagnostics: jest.fn(),
    reapplyBootstrap: jest.fn(),
    reinstallPlugins: jest.fn(),
  };
  return {
    apiFactory: { createObsidianApi: () => obsidianStub },
    __obsidianStub: obsidianStub,
  };
});

const obsidianStub = (
  jest.requireMock("../../../../api") as {
    __obsidianStub: { reapplyBootstrap: jest.Mock };
  }
).__obsidianStub;

const stubReport: VaultDiagnosticsReport = {
  snapshotId: "snap-1",
  vault: {
    ok: true,
    severity: "Ok",
    code: "VAULT_OK",
    message: "",
    actions: [],
    vaultPath: "/tmp/vault",
  },
  plugins: [],
  templater: {
    ok: true,
    severity: "Ok",
    code: "TEMPLATER_OK",
    message: "",
    actions: [],
    templatesFolder: null,
    userScriptsFolder: null,
  },
  bootstrap: {
    ok: true,
    severity: "Ok",
    code: "BOOTSTRAP_OK",
    message: "",
    actions: [],
    files: [],
  },
  restApi: {
    ok: true,
    required: false,
    severity: "Ok",
    code: "REST_OK",
    message: "",
    actions: [],
    host: null,
    version: null,
  },
  lmStudio: { ok: true, severity: "Ok", code: "LM_OK", message: "", actions: [], endpoint: null },
  generatedAt: "2024-01-01T00:00:00Z",
  isHealthy: true,
};

const stubReapplyResult: ObsidianReapplyResult = { report: stubReport };

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("reapplyBootstrapSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + FETCH_DIAGNOSTICS_DONE + REAPPLY_BOOTSTRAP_DONE on happy path", async () => {
    const result = await expectSaga(reapplyBootstrapSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.reapplyBootstrap), stubReapplyResult]])
      .put(fetchDiagnosticsDone(stubReport))
      .put(notifySuccess({ messageKey: "obsidian.diagnostics.reapplyBootstrapSuccess" }))
      .put(reapplyBootstrapDone())
      .run();

    expect(result.storeState.isReapplyingBootstrap).toBe(false);
  });

  it("emits notifyError + REAPPLY_BOOTSTRAP_DONE on throw", async () => {
    const result = await expectSaga(reapplyBootstrapSaga)
      .withReducer(obsidianReducer)
      .provide([
        [
          matchers.call.fn(obsidianStub.reapplyBootstrap),
          throwError(new Error("bootstrap failed")),
        ],
      ])
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
