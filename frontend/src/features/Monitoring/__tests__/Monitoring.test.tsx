import { render } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "../../../styles/theme";
import { I18nextProvider } from "react-i18next";
import i18n from "../../../i18n";
import Monitoring from "../Monitoring";
import type { MonitoringProps } from "../types";
import type { RuntimeState } from "../../../api/gql/graphql";

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

const renderMonitoring = (props: Partial<MonitoringProps> = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={lightTheme}>
        <Monitoring {...defaultProps} {...props} />
      </ThemeProvider>
    </I18nextProvider>
  );

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
