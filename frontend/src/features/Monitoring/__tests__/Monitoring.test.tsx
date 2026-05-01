jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

jest.mock("../../../store/saga/graphql", () => ({
  gqlRequest: jest.fn(),
  gqlSubscriptionChannel: jest.fn(),
}));

import { gqlSubscriptionChannel } from "../../../store/saga/graphql";
import { END, eventChannel } from "redux-saga";
import "../../../i18n";
import { renderWithStore, mockMonitoringState, mergeMockState } from "../../../testUtils";
import Monitoring from "../Monitoring";
import type { MonitoringProps } from "../types";
import type { RuntimeState } from "../../../api/gql/graphql";

const mockedGqlSubscriptionChannel = gqlSubscriptionChannel as jest.Mock;

const mockRuntimeState: RuntimeState = {
  llm: {
    endpoint: "http://localhost:1234",
    online: true,
    lastProbedAt: "2024-01-01T00:00:00Z",
    model: "test-model",
    contextLength: 4096,
    supportsToolCalling: true,
    supportsJsonMode: false,
    lastError: null,
  },
  syncthing: {
    detection: "running",
    binaryPath: "/usr/local/bin/syncthing",
    apiUrl: "http://localhost:8384",
    version: "v1.27.0",
    hint: null,
  },
  services: [
    {
      name: "backend",
      state: "running",
      lastError: null,
      restartCount: 0,
      pid: 12345,
      port: 5050,
    },
    {
      name: "python-sidecar",
      state: "stopped",
      lastError: null,
      restartCount: 1,
      pid: null,
      port: 5060,
    },
  ],
};

const defaultProps: MonitoringProps = {
  runtimeState: null,
  isLoading: false,
  isReprobing: false,
  error: null,
  onReprobe: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  const channel = eventChannel<never>(() => () => {});
  mockedGqlSubscriptionChannel.mockReturnValue(channel);
  void END;
});

const renderMonitoring = (props: Partial<MonitoringProps> = {}) =>
  renderWithStore(<Monitoring {...defaultProps} {...props} />, {
    preloadedState: mergeMockState(mockMonitoringState()),
  });

describe("Monitoring", () => {
  it("renders the page title and reprobe button", () => {
    const { getByTestId } = renderMonitoring();
    expect(getByTestId("monitoring-root")).toBeTruthy();
    expect(getByTestId("monitoring-reprobe-btn")).toBeTruthy();
  });

  it("shows loading state when loading without data", () => {
    const { getByTestId } = renderMonitoring({ isLoading: true });
    expect(getByTestId("monitoring-loading")).toBeTruthy();
  });

  it("shows error state when error is present without data", () => {
    const { getByTestId } = renderMonitoring({ error: "Connection failed" });
    expect(getByTestId("monitoring-error")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    const { getByTestId } = renderMonitoring();
    expect(getByTestId("monitoring-empty")).toBeTruthy();
  });

  it("renders all three panels when runtimeState is present", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: mockRuntimeState });
    expect(getByTestId("monitoring-llm-panel")).toBeTruthy();
    expect(getByTestId("monitoring-syncthing-panel")).toBeTruthy();
    expect(getByTestId("monitoring-services-panel")).toBeTruthy();
  });

  it("shows LLM endpoint and model", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: mockRuntimeState });
    const panel = getByTestId("monitoring-llm-panel");
    expect(panel.textContent).toContain("http://localhost:1234");
    expect(panel.textContent).toContain("test-model");
  });

  it("renders each supervisor service as a row", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: mockRuntimeState });
    expect(getByTestId("monitoring-service-backend")).toBeTruthy();
    expect(getByTestId("monitoring-service-python-sidecar")).toBeTruthy();
  });

  it("matches snapshot with runtime state", () => {
    const { container } = renderMonitoring({ runtimeState: mockRuntimeState });
    expect(container).toMatchSnapshot();
  });
});

describe("SyncthingPanel — detection states (#264)", () => {
  const makeSyncState = (detection: string): RuntimeState => ({
    ...mockRuntimeState,
    syncthing: { ...mockRuntimeState.syncthing, detection },
  });

  it("shows success badge when detection is running", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: makeSyncState("running") });
    const panel = getByTestId("monitoring-syncthing-panel");
    expect(panel.textContent).toContain("Запущен");
  });

  it("shows warning badge when detection is installed-not-running", () => {
    const { getByTestId } = renderMonitoring({
      runtimeState: makeSyncState("installed-not-running"),
    });
    const panel = getByTestId("monitoring-syncthing-panel");
    expect(panel.textContent).toContain("Установлен");
  });

  it("shows error badge when detection is error", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: makeSyncState("error") });
    const panel = getByTestId("monitoring-syncthing-panel");
    expect(panel.textContent).toContain("Ошибка");
  });

  it("shows neutral badge when detection is not-installed", () => {
    const { getByTestId } = renderMonitoring({ runtimeState: makeSyncState("not-installed") });
    const panel = getByTestId("monitoring-syncthing-panel");
    expect(panel.textContent).toContain("Не установлен");
  });
});
