import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

import type { RoutineDefinition, RoutineRun } from "../../../../domain/routines";
import {
  loadRoutines,
  loadRoutinesSuccess,
  loadRoutinesFailure,
  toggleRoutine,
  toggleRoutineSuccess,
  toggleRoutineFailure,
  runRoutineNow,
  runRoutineNowSuccess,
  runRoutineNowFailure,
} from "../actions";
import { routinesReducer } from "../reducer";
import { loadRoutinesSaga, toggleRoutineSaga, runRoutineNowSaga } from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;

const makeRoutineRun = (overrides: Partial<RoutineRun> = {}): RoutineRun => ({
  id: "run-1",
  routineKey: "action-extractor",
  startedAt: "2026-04-28T10:00:00Z",
  finishedAt: "2026-04-28T10:00:05Z",
  status: "Completed",
  errorMessage: null,
  payloadSummary: null,
  ...overrides,
});

const makeRoutineDefinition = (overrides: Partial<RoutineDefinition> = {}): RoutineDefinition => ({
  key: "action-extractor",
  displayName: "Action Extractor",
  description: "Extracts actions from notes",
  isEnabled: true,
  lastRun: null,
  ...overrides,
});

const gqlRoutineRun = {
  __typename: "RoutineRunDto" as const,
  id: "run-1",
  routineKey: "action-extractor",
  startedAt: "2026-04-28T10:00:00Z",
  finishedAt: "2026-04-28T10:00:05Z",
  status: "Completed",
  errorMessage: null,
  payloadSummary: null,
};

const gqlRoutineDefinition = {
  __typename: "RoutineDefinitionDto" as const,
  key: "action-extractor",
  displayName: "Action Extractor",
  description: "Extracts actions from notes",
  isEnabled: true,
  lastRun: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadRoutinesSaga", () => {
  it("dispatches LOAD_ROUTINES_SUCCESS with mapped routines on success", async () => {
    mockedRequest.mockResolvedValueOnce({ routines: [gqlRoutineDefinition] });

    await expectSaga(loadRoutinesSaga)
      .withReducer(routinesReducer)
      .dispatch(loadRoutines())
      .put(loadRoutinesSuccess([makeRoutineDefinition()]))
      .silentRun(50);
  });

  it("dispatches LOAD_ROUTINES_SUCCESS with lastRun mapped when present", async () => {
    mockedRequest.mockResolvedValueOnce({
      routines: [{ ...gqlRoutineDefinition, lastRun: gqlRoutineRun }],
    });

    await expectSaga(loadRoutinesSaga)
      .withReducer(routinesReducer)
      .put(loadRoutinesSuccess([makeRoutineDefinition({ lastRun: makeRoutineRun() })]))
      .silentRun(50);
  });

  it("dispatches LOAD_ROUTINES_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadRoutinesSaga)
      .withReducer(routinesReducer)
      .put(loadRoutinesFailure("network error"))
      .silentRun(50);
  });

  it("dispatches LOAD_ROUTINES_FAILURE with fallback message on unknown error", async () => {
    mockedRequest.mockRejectedValueOnce("non-error object");

    await expectSaga(loadRoutinesSaga)
      .withReducer(routinesReducer)
      .put(loadRoutinesFailure("Unknown error"))
      .silentRun(50);
  });
});

describe("toggleRoutineSaga", () => {
  it("dispatches TOGGLE_ROUTINE_SUCCESS with mapped routine on success", async () => {
    const updatedGql = { ...gqlRoutineDefinition, isEnabled: false };
    mockedRequest.mockResolvedValueOnce({ toggleRoutine: updatedGql });

    await expectSaga(toggleRoutineSaga, toggleRoutine("action-extractor", false))
      .withReducer(routinesReducer)
      .put(toggleRoutineSuccess(makeRoutineDefinition({ isEnabled: false })))
      .silentRun(50);
  });

  it("dispatches TOGGLE_ROUTINE_SUCCESS with lastRun when present", async () => {
    const updatedGql = { ...gqlRoutineDefinition, isEnabled: true, lastRun: gqlRoutineRun };
    mockedRequest.mockResolvedValueOnce({ toggleRoutine: updatedGql });

    await expectSaga(toggleRoutineSaga, toggleRoutine("action-extractor", true))
      .withReducer(routinesReducer)
      .put(toggleRoutineSuccess(makeRoutineDefinition({ lastRun: makeRoutineRun() })))
      .silentRun(50);
  });

  it("dispatches TOGGLE_ROUTINE_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("forbidden"));

    await expectSaga(toggleRoutineSaga, toggleRoutine("action-extractor", false))
      .withReducer(routinesReducer)
      .put(toggleRoutineFailure("forbidden"))
      .silentRun(50);
  });
});

describe("runRoutineNowSaga", () => {
  it("dispatches RUN_ROUTINE_NOW_SUCCESS with mapped run on success", async () => {
    mockedRequest.mockResolvedValueOnce({ runRoutineNow: gqlRoutineRun });

    await expectSaga(runRoutineNowSaga, runRoutineNow("action-extractor"))
      .withReducer(routinesReducer)
      .put(runRoutineNowSuccess(makeRoutineRun()))
      .silentRun(50);
  });

  it("dispatches RUN_ROUTINE_NOW_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(runRoutineNowSaga, runRoutineNow("action-extractor"))
      .withReducer(routinesReducer)
      .put(runRoutineNowFailure("timeout"))
      .silentRun(50);
  });

  it("dispatches RUN_ROUTINE_NOW_FAILURE with fallback on unknown error", async () => {
    mockedRequest.mockRejectedValueOnce(42);

    await expectSaga(runRoutineNowSaga, runRoutineNow("action-extractor"))
      .withReducer(routinesReducer)
      .put(runRoutineNowFailure("Unknown error"))
      .silentRun(50);
  });
});
