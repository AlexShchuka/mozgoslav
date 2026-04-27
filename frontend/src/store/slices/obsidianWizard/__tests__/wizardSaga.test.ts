import { expectSaga } from "redux-saga-test-plan";

import { runWizardStep, runWizardStepDone, runWizardStepFailed } from "../actions";
import { obsidianWizardReducer } from "../reducer";
import { wizardSaga } from "../saga/wizardSaga";
// stubGqlReport is plain JSON shaped per the GQL response, so the saga's mapper accepts it.

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const dispatch = (action: unknown) => action as Parameters<typeof obsidianWizardReducer>[1];

const stubGqlReport = {
  snapshotId: "snap-2",
  generatedAt: "2024-01-01T00:00:00Z",
  isHealthy: false,
  vault: {
    ok: true,
    severity: "OK",
    code: "VAULT_OK",
    message: "",
    actions: [],
    vaultPath: "/tmp/vault",
  },
  plugins: [],
  templater: {
    ok: false,
    severity: "WARNING",
    code: "TEMPLATER_MISSING",
    message: "configure",
    actions: ["OPEN_SETTINGS"],
    templatesFolder: null,
    userScriptsFolder: null,
  },
  bootstrap: {
    ok: true,
    severity: "OK",
    code: "BOOTSTRAP_OK",
    message: "",
    actions: [],
    files: [],
  },
  restApi: {
    ok: true,
    required: false,
    severity: "OK",
    code: "REST_OK",
    message: "",
    actions: [],
    host: null,
    version: null,
  },
  lmStudio: { ok: true, severity: "OK", code: "LM_OK", message: "", actions: [], endpoint: null },
};

describe("wizardSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits runWizardStepDone with diagnostics on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianRunWizardStep: {
        currentStep: 1,
        nextStep: 2,
        diagnostics: stubGqlReport,
        errors: [],
      },
    });

    await expectSaga(wizardSaga, runWizardStep(1))
      .withReducer(obsidianWizardReducer)
      .put.actionType("obsidianWizard/RUN_STEP_DONE")
      .run();
  });

  it("emits runWizardStepFailed when payload has errors", async () => {
    mockedRequest.mockResolvedValueOnce({
      obsidianRunWizardStep: {
        currentStep: 1,
        nextStep: null,
        diagnostics: null,
        errors: [{ code: "X", message: "step failed" }],
      },
    });

    const result = await expectSaga(wizardSaga, runWizardStep(1))
      .withReducer(obsidianWizardReducer)
      .put(runWizardStepFailed("step failed"))
      .run();

    expect(result.storeState.error).toBe("step failed");
  });

  it("emits runWizardStepFailed on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network down"));

    const result = await expectSaga(wizardSaga, runWizardStep(1))
      .withReducer(obsidianWizardReducer)
      .put(runWizardStepFailed("network down"))
      .run();

    expect(result.storeState.error).toBe("network down");
  });

  it("reducer — RUN_WIZARD_STEP flips isStepRunning true", () => {
    const state = obsidianWizardReducer(undefined, dispatch(runWizardStep(1)));
    expect(state.isStepRunning).toBe(true);
  });

  it("reducer — RUN_WIZARD_STEP_DONE updates currentStep + nextStep", () => {
    const state = obsidianWizardReducer(undefined, dispatch(runWizardStepDone(2, 3, null)));
    expect(state.currentStep).toBe(2);
    expect(state.nextStep).toBe(3);
    expect(state.isComplete).toBe(false);
  });

  it("reducer — RUN_WIZARD_STEP_DONE with null nextStep marks complete", () => {
    const state = obsidianWizardReducer(undefined, dispatch(runWizardStepDone(5, null, null)));
    expect(state.isComplete).toBe(true);
  });
});
