import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import { fetchDiagnostics, fetchDiagnosticsDone, fetchDiagnosticsFailed } from "../actions";
import { obsidianReducer } from "../reducer";
import { diagnosticsSaga } from "../saga/diagnosticsSaga";
import type { VaultDiagnosticsReport } from "../apiTypes";

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
    __obsidianStub: { diagnostics: jest.Mock };
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

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("diagnosticsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits FETCH_DIAGNOSTICS_DONE on happy path", async () => {
    const result = await expectSaga(diagnosticsSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.diagnostics), stubReport]])
      .put(fetchDiagnosticsDone(stubReport))
      .run();

    expect(result.storeState.isDiagnosticsLoading).toBe(false);
  });

  it("emits FETCH_DIAGNOSTICS_FAILED on throw", async () => {
    const result = await expectSaga(diagnosticsSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.diagnostics), throwError(new Error("timeout"))]])
      .put(fetchDiagnosticsFailed("timeout"))
      .run();

    expect(result.storeState.isDiagnosticsLoading).toBe(false);
  });

  it("reducer — FETCH_DIAGNOSTICS flips isDiagnosticsLoading true", () => {
    const state = obsidianReducer(undefined, dispatch(fetchDiagnostics()));
    expect(state.isDiagnosticsLoading).toBe(true);
  });

  it("reducer — FETCH_DIAGNOSTICS_DONE stores report", () => {
    const state = obsidianReducer(undefined, dispatch(fetchDiagnosticsDone(stubReport)));
    expect(state.diagnostics).toEqual(stubReport);
    expect(state.isDiagnosticsLoading).toBe(false);
  });
});
