import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";

import Obsidian from "../Obsidian";
import { api } from "../../../api/MozgoslavApi";
import { lightTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api/MozgoslavApi", () => ({
  api: {
    getSettings: jest.fn().mockResolvedValue({
      vaultPath: "/tmp/vault",
      obsidianAutoTags: [],
    }),
    saveSettings: jest.fn().mockResolvedValue({}),
    setupObsidian: jest.fn().mockResolvedValue({ createdPaths: [] }),
    bulkExportObsidian: jest.fn(),
    applyObsidianLayout: jest.fn(),
  },
}));

const renderObsidian = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <Obsidian />
      <ToastContainer />
    </ThemeProvider>,
  );

describe("Obsidian — first-class tab (BC-025 / Bug 22)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("Obsidian_SyncAll_CallsBulkExport", async () => {
    (api.bulkExportObsidian as jest.Mock).mockResolvedValue({ exportedCount: 3 });

    renderObsidian();

    const btn = await screen.findByTestId("obsidian-sync-all");
    await userEvent.click(btn);

    await waitFor(() => expect(api.bulkExportObsidian).toHaveBeenCalledTimes(1));
  });

  it("Obsidian_ApplyLayout_ShowsCounts_ToastSuccess", async () => {
    (api.applyObsidianLayout as jest.Mock).mockResolvedValue({
      createdFolders: 2,
      movedNotes: 7,
    });

    renderObsidian();

    const btn = await screen.findByTestId("obsidian-apply-layout");
    await userEvent.click(btn);

    await waitFor(() => expect(api.applyObsidianLayout).toHaveBeenCalledTimes(1));
    // Toast messages render in a portal; the counts should appear.
    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/7/)).toBeInTheDocument();
    });
  });
});
