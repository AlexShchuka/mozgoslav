import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Obsidian from "../index";
import { FETCH_DIAGNOSTICS, REAPPLY_BOOTSTRAP } from "../../../store/slices/obsidian";
import { RUN_WIZARD_STEP } from "../../../store/slices/obsidianWizard";
import {
  mergeMockState,
  mockObsidianState,
  mockObsidianWizardState,
  mockSettingsState,
  renderWithStore,
} from "../../../testUtils";
import type { VaultDiagnosticsReport } from "../../../domain/obsidian/types";
import { DEFAULT_SETTINGS } from "../../../domain/Settings";
import "../../../i18n";

const renderObsidian = (preloaded?: Parameters<typeof renderWithStore>[1]) =>
  renderWithStore(
    <MemoryRouter>
      <Obsidian />
      <ToastContainer />
    </MemoryRouter>,
    preloaded
  );

const okReport = (vaultOk: boolean): VaultDiagnosticsReport => ({
  snapshotId: "snap-1",
  generatedAt: "2024-01-01T00:00:00Z",
  isHealthy: vaultOk,
  vault: {
    ok: vaultOk,
    severity: vaultOk ? "OK" : "ERROR",
    code: vaultOk ? "VAULT_OK" : "VAULT_MISSING",
    message: vaultOk ? "" : "vault not found",
    actions: [],
    vaultPath: "/tmp/vault",
  },
  plugins: [
    {
      pluginId: "obsidian-mozgoslav",
      installed: true,
      enabled: true,
      hashMatches: true,
      optional: false,
      expectedVersion: "1.0.0",
      installedVersion: "1.0.0",
      severity: "OK",
      code: "PLUGIN_OK",
      message: "",
      actions: [],
      ok: true,
    },
  ],
  templater: {
    ok: true,
    severity: "OK",
    code: "TEMPLATER_OK",
    message: "templater configured",
    actions: [],
    templatesFolder: "Templates",
    userScriptsFolder: "Scripts",
  },
  bootstrap: {
    ok: true,
    severity: "OK",
    code: "BOOTSTRAP_OK",
    message: "in sync",
    actions: [],
    files: [],
  },
  restApi: {
    ok: true,
    required: false,
    severity: "OK",
    code: "REST_OK",
    message: "rest api ok",
    actions: [],
    host: "localhost",
    version: "3.1.0",
  },
  lmStudio: {
    ok: true,
    severity: "OK",
    code: "LM_OK",
    message: "lm studio reachable",
    actions: [],
    endpoint: "http://localhost:1234",
  },
});

describe("Obsidian feature", () => {
  it("dispatches FETCH_DIAGNOSTICS on mount", async () => {
    const { getActions } = renderObsidian();
    await waitFor(() => expect(getActions().some((a) => a.type === FETCH_DIAGNOSTICS)).toBe(true));
  });

  it("renders wizard stepper when vault diagnostics are not ok", async () => {
    const preloaded = mergeMockState(
      mockSettingsState({ settings: { ...DEFAULT_SETTINGS, vaultPath: "/tmp/vault" } }),
      mockObsidianState({ diagnostics: okReport(false) }),
      mockObsidianWizardState({ currentStep: 1, nextStep: 1 })
    );
    renderObsidian({ preloadedState: preloaded });

    expect(await screen.findByTestId("obsidian-wizard-stepper")).toBeInTheDocument();
    for (let step = 1; step <= 5; step++) {
      expect(screen.getByTestId(`obsidian-wizard-step-${step}`)).toBeInTheDocument();
    }
  });

  it("dispatches RUN_WIZARD_STEP when wizard run button clicked", async () => {
    const preloaded = mergeMockState(
      mockSettingsState({ settings: { ...DEFAULT_SETTINGS, vaultPath: "/tmp/vault" } }),
      mockObsidianState({ diagnostics: okReport(false) }),
      mockObsidianWizardState({ currentStep: 1, nextStep: 1 })
    );
    const { getActions } = renderObsidian({ preloadedState: preloaded });

    const runBtn = await screen.findByTestId("obsidian-wizard-run");
    await userEvent.click(runBtn);

    await waitFor(() =>
      expect(getActions().find((a) => a.type === RUN_WIZARD_STEP)).toEqual({
        type: RUN_WIZARD_STEP,
        payload: { step: 1 },
      })
    );
  });

  it("renders diagnostics chips when vault is ok", async () => {
    const preloaded = mergeMockState(
      mockSettingsState({ settings: { ...DEFAULT_SETTINGS, vaultPath: "/tmp/vault" } }),
      mockObsidianState({ diagnostics: okReport(true) })
    );
    renderObsidian({ preloadedState: preloaded });

    expect(await screen.findByTestId("obsidian-diagnostics-grid")).toBeInTheDocument();
    expect(screen.getAllByTestId("obsidian-chip-OK").length).toBeGreaterThanOrEqual(6);
  });

  it("dispatches REAPPLY_BOOTSTRAP when reapply button clicked", async () => {
    const preloaded = mergeMockState(
      mockSettingsState({ settings: { ...DEFAULT_SETTINGS, vaultPath: "/tmp/vault" } }),
      mockObsidianState({ diagnostics: okReport(true) })
    );
    const { getActions } = renderObsidian({ preloadedState: preloaded });

    const btn = await screen.findByTestId("obsidian-reapply-bootstrap");
    await userEvent.click(btn);

    await waitFor(() => expect(getActions().some((a) => a.type === REAPPLY_BOOTSTRAP)).toBe(true));
  });
});
