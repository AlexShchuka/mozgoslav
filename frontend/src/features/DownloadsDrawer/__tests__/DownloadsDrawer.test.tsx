import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DownloadState } from "../../../api/gql/graphql";
import { renderWithStore } from "../../../testUtils";
import { darkTheme } from "../../../styles/theme";
import "../../../i18n";
import DownloadsDrawer from "../DownloadsDrawer";

const makeDownload = (
  overrides: Partial<Parameters<typeof DownloadsDrawer>[0]["downloads"][number]> = {}
) => ({
  id: "dl-1",
  catalogueId: "whisper-large",
  state: DownloadState.Downloading,
  bytesReceived: 1024,
  totalBytes: 10240,
  speedBytesPerSecond: 50000,
  errorMessage: null,
  startedAt: "2026-05-01T00:00:00Z",
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  downloads: [makeDownload()],
  cancellingDownloadId: null,
  onClose: jest.fn(),
  onCancel: jest.fn(),
  onRetry: jest.fn(),
};

describe("DownloadsDrawer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders drawer when isOpen=true", () => {
    renderWithStore(<DownloadsDrawer {...defaultProps} />, { theme: darkTheme });
    expect(screen.getByTestId("downloads-drawer")).toBeInTheDocument();
  });

  it("does not render when isOpen=false", () => {
    renderWithStore(<DownloadsDrawer {...defaultProps} isOpen={false} />, { theme: darkTheme });
    expect(screen.queryByTestId("downloads-drawer")).toBeNull();
  });

  it("TC-F06: shows empty message when no downloads (badge hidden)", () => {
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[]} />, { theme: darkTheme });
    expect(screen.getByTestId("downloads-empty")).toBeInTheDocument();
  });

  it("renders download item for each active download", () => {
    renderWithStore(<DownloadsDrawer {...defaultProps} />, { theme: darkTheme });
    expect(screen.getByTestId("download-item-dl-1")).toBeInTheDocument();
    expect(screen.getByText("whisper-large")).toBeInTheDocument();
  });

  it("shows cancel button for active downloads", () => {
    renderWithStore(<DownloadsDrawer {...defaultProps} />, { theme: darkTheme });
    expect(screen.getByTestId("download-cancel-dl-1")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button clicked", async () => {
    const onCancel = jest.fn();
    renderWithStore(<DownloadsDrawer {...defaultProps} onCancel={onCancel} />, {
      theme: darkTheme,
    });
    await userEvent.click(screen.getByTestId("download-cancel-dl-1"));
    expect(onCancel).toHaveBeenCalledWith("dl-1");
  });

  it("TC-F12: calls onClose when overlay clicked", async () => {
    const onClose = jest.fn();
    renderWithStore(<DownloadsDrawer {...defaultProps} onClose={onClose} />, { theme: darkTheme });
    await userEvent.click(screen.getByTestId("downloads-drawer-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("TC-F07: 3 active items render in order, all items visible", () => {
    const downloads = [
      makeDownload({ id: "dl-1", catalogueId: "whisper-small", startedAt: "2026-05-01T01:00:00Z" }),
      makeDownload({ id: "dl-2", catalogueId: "whisper-large", startedAt: "2026-05-01T02:00:00Z" }),
      makeDownload({ id: "dl-3", catalogueId: "llama-model", startedAt: "2026-05-01T03:00:00Z" }),
    ];
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={downloads} />, {
      theme: darkTheme,
    });
    expect(screen.getByTestId("download-item-dl-1")).toBeInTheDocument();
    expect(screen.getByTestId("download-item-dl-2")).toBeInTheDocument();
    expect(screen.getByTestId("download-item-dl-3")).toBeInTheDocument();
  });

  it("TC-F08: shows formatted speed and ETA labels", () => {
    const download = makeDownload({
      bytesReceived: 1024 * 1024,
      totalBytes: 10 * 1024 * 1024,
      speedBytesPerSecond: 1024 * 1024,
    });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.getByTestId("download-speed-dl-1")).toHaveTextContent(/MB\/s/);
    expect(screen.getByTestId("download-eta-dl-1")).not.toHaveTextContent("NaN");
  });

  it("TC-F08: shows placeholder when speed is 0", () => {
    const download = makeDownload({ speedBytesPerSecond: 0 });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.getByTestId("download-speed-dl-1")).toHaveTextContent("—");
    expect(screen.getByTestId("download-eta-dl-1")).toHaveTextContent("—");
  });

  it("TC-F08: shows placeholder when speed is null", () => {
    const download = makeDownload({ speedBytesPerSecond: null });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.getByTestId("download-speed-dl-1")).toHaveTextContent("—");
  });

  it("TC-F09b: Cancel button disabled when phase=FINALIZING", () => {
    const download = makeDownload({ state: DownloadState.Finalizing });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    const cancelBtn = screen.getByTestId("download-cancel-dl-1");
    expect(cancelBtn).toBeDisabled();
  });

  it("does not show cancel button for failed downloads", () => {
    const download = makeDownload({ state: DownloadState.Failed, errorMessage: "HTTP 404" });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.queryByTestId("download-cancel-dl-1")).toBeNull();
  });

  it("TC-F11: FAILED row shows Retry button", () => {
    const download = makeDownload({
      state: DownloadState.Failed,
      errorMessage: "Network timeout",
    });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.getByTestId("download-retry-dl-1")).toBeInTheDocument();
  });

  it("TC-F11: Retry button dispatches retry action", async () => {
    const onRetry = jest.fn();
    const download = makeDownload({
      state: DownloadState.Failed,
      catalogueId: "whisper-large",
      errorMessage: "Network timeout",
    });
    renderWithStore(
      <DownloadsDrawer {...defaultProps} downloads={[download]} onRetry={onRetry} />,
      {
        theme: darkTheme,
      }
    );
    await userEvent.click(screen.getByTestId("download-retry-dl-1"));
    expect(onRetry).toHaveBeenCalledWith("whisper-large");
  });
});
