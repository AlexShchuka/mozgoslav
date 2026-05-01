import { act } from "@testing-library/react";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

jest.mock("../../../store/saga/graphql", () => ({
  gqlRequest: jest.fn(),
  gqlSubscriptionChannel: jest.fn(),
}));

import { gqlSubscriptionChannel } from "../../../store/saga/graphql";
import { renderWithStore, mockMonitoringState, mergeMockState } from "../../../testUtils";
import MonitoringContainer from "../Monitoring.container";
import {
  monitoringSubscribe,
  monitoringUnsubscribe,
  monitoringReprobeRequested,
  selectMonitoringRuntimeState,
  selectMonitoringError,
} from "../../../store/slices/monitoring";
import type { RuntimeState } from "../../../api/gql/graphql";
import { END, eventChannel } from "redux-saga";

const mockedGqlSubscriptionChannel = gqlSubscriptionChannel as jest.Mock;

const makeRuntimeState = (): RuntimeState =>
  ({
    llm: {
      endpoint: "http://localhost:1234",
      online: true,
      lastProbedAt: "2024-01-01T00:00:00Z",
      model: "test-model",
      contextLength: 4096,
      supportsToolCalling: false,
      supportsJsonMode: false,
      lastError: null,
    },
    syncthing: {
      detection: "not-installed",
      binaryPath: null,
      apiUrl: null,
      version: null,
      hint: null,
    },
    services: [],
  }) as unknown as RuntimeState;

beforeEach(() => {
  jest.clearAllMocks();
  const channel = eventChannel<never>(() => () => {});
  mockedGqlSubscriptionChannel.mockReturnValue(channel);
  void END;
});

describe("Monitoring container — mapStateToProps", () => {
  it("maps runtimeState from slice to props", () => {
    const runtimeState = makeRuntimeState();
    const { getByTestId } = renderWithStore(<MonitoringContainer />, {
      preloadedState: mergeMockState(mockMonitoringState({ runtimeState, isLoading: false })),
    });
    expect(getByTestId("monitoring-llm-panel")).toBeTruthy();
  });

  it("maps error from slice to props", () => {
    const { getByTestId } = renderWithStore(<MonitoringContainer />, {
      preloadedState: mergeMockState(
        mockMonitoringState({ error: "Connection failed", isLoading: false })
      ),
    });
    expect(getByTestId("monitoring-error")).toBeTruthy();
  });
});

describe("Monitoring container — lifecycle", () => {
  it("dispatches monitoringSubscribe on mount", () => {
    const { getActions } = renderWithStore(<MonitoringContainer />, {
      preloadedState: mergeMockState(mockMonitoringState()),
    });
    expect(getActions()).toContainEqual(monitoringSubscribe());
  });

  it("dispatches monitoringUnsubscribe on unmount", () => {
    const { unmount, getActions } = renderWithStore(<MonitoringContainer />, {
      preloadedState: mergeMockState(mockMonitoringState()),
    });
    act(() => {
      unmount();
    });
    expect(getActions()).toContainEqual(monitoringUnsubscribe());
  });
});

describe("Monitoring container — onReprobe", () => {
  it("dispatches monitoringReprobeRequested when reprobe button clicked", () => {
    const { getByTestId, getActions } = renderWithStore(<MonitoringContainer />, {
      preloadedState: mergeMockState(mockMonitoringState()),
    });
    getByTestId("monitoring-reprobe-btn").click();
    expect(getActions()).toContainEqual(monitoringReprobeRequested());
  });
});

void selectMonitoringRuntimeState;
void selectMonitoringError;
