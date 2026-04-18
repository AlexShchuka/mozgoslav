import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Models from "../Models";
import { renderWithStore, type MockApiBundle } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const { createMockApi } = jest.requireActual(
    "../../../testUtils/mockApi",
  ) as typeof import("../../../testUtils/mockApi");
  const bundle = createMockApi();
  return {
    ...actual,
    apiFactory: bundle.factory,
    __bundle: bundle,
  };
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

const renderModels = () =>
  renderWithStore(
    <MemoryRouter>
      <Models />
    </MemoryRouter>,
    { theme: darkTheme },
  );

describe("Models page — task #13 inline download progress", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).EventSource = StubEventSource;
    mockApi.modelsApi.list.mockResolvedValue([
      {
        id: "whisper-small-russian-bundle",
        name: "Whisper Small",
        description: "Bundled STT",
        url: "u",
        sizeMb: 260,
        kind: "Stt",
        tier: "bundle",
        isDefault: false,
        destinationPath: "/models/ggml-small-q8_0.bin",
        installed: false,
      },
    ]);
  });

  it("mounts <ModelDownloadProgress/> under a row when Download is clicked", async () => {
    mockApi.modelsApi.download.mockResolvedValue({ downloadId: "dl-abc" });

    renderModels();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /скачать/i }));

    await waitFor(() =>
      expect(mockApi.modelsApi.download).toHaveBeenCalledWith("whisper-small-russian-bundle"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("model-download-dl-abc")).toBeInTheDocument(),
    );
  });

  it("does not mount progress before the click", async () => {
    renderModels();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /скачать/i })).toBeInTheDocument(),
    );

    expect(screen.queryByTestId(/^model-download-/)).toBeNull();
  });
});
