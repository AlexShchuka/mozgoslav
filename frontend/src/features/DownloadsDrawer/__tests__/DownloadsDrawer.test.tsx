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

  it("shows empty message when no downloads", () => {
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

  it("calls onClose when overlay clicked", async () => {
    const onClose = jest.fn();
    renderWithStore(<DownloadsDrawer {...defaultProps} onClose={onClose} />, { theme: darkTheme });
    await userEvent.click(screen.getByTestId("downloads-drawer-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not show cancel button for failed downloads", () => {
    const download = makeDownload({ state: DownloadState.Failed, errorMessage: "HTTP 404" });
    renderWithStore(<DownloadsDrawer {...defaultProps} downloads={[download]} />, {
      theme: darkTheme,
    });
    expect(screen.queryByTestId("download-cancel-dl-1")).toBeNull();
  });
});
