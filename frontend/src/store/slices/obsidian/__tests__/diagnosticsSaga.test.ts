import { expectSaga } from "redux-saga-test-plan";

import { fetchDiagnostics, fetchDiagnosticsDone, fetchDiagnosticsFailed } from "../actions";
import { obsidianReducer } from "../reducer";
import { diagnosticsSaga } from "../saga/diagnosticsSaga";
import type { CheckSeverity, VaultDiagnosticsReport } from "../apiTypes";

const SEV_OK: CheckSeverity = "OK";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const stubGqlReport = {
  snapshotId: "snap-1",
  generatedAt: "2024-01-01T00:00:00Z",
  isHealthy: true,
  vault: {
    ok: true,
    severity: SEV_OK,
    code: "VAULT_OK",
    message: "",
    actions: [],
    vaultPath: "/tmp/vault",
  },
  plugins: [],
  templater: {
    ok: true,
    severity: SEV_OK,
    code: "TEMPLATER_OK",
    message: "",
    actions: [],
    templatesFolder: null,
    userScriptsFolder: null,
  },
  bootstrap: {
    ok: true,
    severity: SEV_OK,
    code: "BOOTSTRAP_OK",
    message: "",
    actions: [],
    files: [],
  },
  restApi: {
    ok: true,
    required: false,
    severity: SEV_OK,
    code: "REST_OK",
    message: "",
    actions: [],
    host: null,
    version: null,
  },
  lmStudio: {
    ok: true,
    severity: SEV_OK,
    code: "LM_OK",
    message: "",
    actions: [],
    endpoint: null,
  },
};

const mappedReport: VaultDiagnosticsReport = {
  snapshotId: "snap-1",
  generatedAt: "2024-01-01T00:00:00Z",
  isHealthy: true,
  vault: { ...stubGqlReport.vault },
  plugins: [],
  templater: { ...stubGqlReport.templater },
  bootstrap: { ...stubGqlReport.bootstrap, files: [] },
  restApi: { ...stubGqlReport.restApi },
  lmStudio: { ...stubGqlReport.lmStudio },
};

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("diagnosticsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits FETCH_DIAGNOSTICS_DONE on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianRunDiagnostics: { report: stubGqlReport, errors: [] },
    });

    const result = await expectSaga(diagnosticsSaga)
      .withReducer(obsidianReducer)
      .put(fetchDiagnosticsDone(mappedReport))
      .run();

    expect(result.storeState.isDiagnosticsLoading).toBe(false);
  });

  it("emits FETCH_DIAGNOSTICS_FAILED when payload contains errors", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianRunDiagnostics: {
        report: null,
        errors: [{ code: "X", message: "snapshot stale" }],
      },
    });

    const result = await expectSaga(diagnosticsSaga)
      .withReducer(obsidianReducer)
      .put(fetchDiagnosticsFailed("snapshot stale"))
      .run();

    expect(result.storeState.isDiagnosticsLoading).toBe(false);
  });

  it("emits FETCH_DIAGNOSTICS_FAILED on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    const result = await expectSaga(diagnosticsSaga)
      .withReducer(obsidianReducer)
      .put(fetchDiagnosticsFailed("timeout"))
      .run();

    expect(result.storeState.isDiagnosticsLoading).toBe(false);
  });

  it("reducer — FETCH_DIAGNOSTICS flips isDiagnosticsLoading true", () => {
    const state = obsidianReducer(undefined, dispatch(fetchDiagnostics()));
    expect(state.isDiagnosticsLoading).toBe(true);
  });

  it("reducer — FETCH_DIAGNOSTICS_DONE stores report", () => {
    const state = obsidianReducer(undefined, dispatch(fetchDiagnosticsDone(mappedReport)));
    expect(state.diagnostics).toEqual(mappedReport);
    expect(state.isDiagnosticsLoading).toBe(false);
  });
});
