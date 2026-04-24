import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import { notifyError, notifySuccess } from "../../notifications";
import { reinstallPlugins, reinstallPluginsDone, fetchDiagnosticsDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { reinstallPluginsSaga } from "../saga/reinstallPluginsSaga";
import type { ObsidianReinstallResult, VaultDiagnosticsReport } from "../apiTypes";

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
    __obsidianStub: { reinstallPlugins: jest.Mock };
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

const stubInstallResult: ObsidianReinstallResult = {
  plugins: [
    { pluginId: "obsidian-mozgoslav", status: "Installed", message: null, writtenFiles: [] },
    { pluginId: "obsidian-bridge", status: "AlreadyInstalled", message: null, writtenFiles: [] },
  ],
  report: stubReport,
};

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("reinstallPluginsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + FETCH_DIAGNOSTICS_DONE + REINSTALL_PLUGINS_DONE on happy path", async () => {
    const result = await expectSaga(reinstallPluginsSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.reinstallPlugins), stubInstallResult]])
      .put(fetchDiagnosticsDone(stubReport))
      .put(
        notifySuccess({
          messageKey: "obsidian.diagnostics.reinstallPluginsSuccess",
          params: { count: 2 },
        })
      )
      .put(reinstallPluginsDone())
      .run();

    expect(result.storeState.isReinstallingPlugins).toBe(false);
  });

  it("emits notifyError + REINSTALL_PLUGINS_DONE on throw", async () => {
    const result = await expectSaga(reinstallPluginsSaga)
      .withReducer(obsidianReducer)
      .provide([
        [matchers.call.fn(obsidianStub.reinstallPlugins), throwError(new Error("install failed"))],
      ])
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
