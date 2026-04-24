import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Obsidian from "../index";
import { BULK_EXPORT, APPLY_LAYOUT } from "../../../store/slices/obsidian";
import { renderWithStore } from "../../../testUtils";
import "../../../i18n";

const renderObsidian = () =>
  renderWithStore(
    <MemoryRouter>
      <Obsidian />
      <ToastContainer />
    </MemoryRouter>
  );

describe("Obsidian — first-class tab (BC-025 / Bug 22)", () => {
  it("Obsidian_SyncAll_DispatchesBulkExport", async () => {
    const { getActions } = renderObsidian();

    const btn = await screen.findByTestId("obsidian-sync-all");
    await userEvent.click(btn);

    await waitFor(() => expect(getActions().some((a) => a.type === BULK_EXPORT)).toBe(true));
  });

  it("Obsidian_ApplyLayout_DispatchesApplyLayout", async () => {
    const { getActions } = renderObsidian();

    const btn = await screen.findByTestId("obsidian-apply-layout");
    await userEvent.click(btn);

    await waitFor(() => expect(getActions().some((a) => a.type === APPLY_LAYOUT)).toBe(true));
  });
});
