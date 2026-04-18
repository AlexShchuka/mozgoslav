import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Home from "../Home";
import { renderWithStore, type MockApiBundle } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const { createMockApi } = jest.requireActual(
    "../../../testUtils/mockApi",
  ) as typeof import("../../../testUtils/mockApi");
  const bundle = createMockApi();
  return { ...actual, apiFactory: bundle.factory, __bundle: bundle };
});

const mockApi = (
  jest.requireMock("../../../api") as { __bundle: MockApiBundle }
).__bundle;

class StubEventSource {
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  public onerror: ((ev: Event) => void) | null = null;
  public addEventListener(): void {}
  public removeEventListener(): void {}
  public close(): void {}
}

describe("Home (task L1 — Мозгослав unified page)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).EventSource = StubEventSource;
    mockApi.recordingApi.getAll.mockResolvedValue([]);
    mockApi.jobsApi.list.mockResolvedValue([]);
  });

  it("renders both Dashboard and Queue surfaces on a single page", async () => {
    renderWithStore(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
      { theme: darkTheme },
    );

    // Dashboard-side: the record button's testid is the stable anchor.
    expect(await screen.findByTestId("dashboard-record")).toBeInTheDocument();
    // Queue-side: the component emits its empty-state when jobsApi.list returns [].
    expect(
      screen.getByText(/импортируй новую запись/i),
    ).toBeInTheDocument();
  });
});
