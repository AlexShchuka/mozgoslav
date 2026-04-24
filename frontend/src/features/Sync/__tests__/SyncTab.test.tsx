import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Sync from "../Sync";
import { SAVE_SETTINGS } from "../../../store/slices/settings";
import { LOAD_STATUS, LOAD_PAIRING } from "../../../store/slices/sync";
import { DEFAULT_SETTINGS } from "../../../domain/Settings";
import { renderWithStore, mockSettingsState } from "../../../testUtils";
import "../../../i18n";

const stubSettingsLoaded = { ...DEFAULT_SETTINGS, syncthingEnabled: false };

const renderSync = (settingsPatch: Parameters<typeof mockSettingsState>[0] = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Sync />
    </MemoryRouter>,
    {
      preloadedState: mockSettingsState(settingsPatch),
    }
  );

describe("Sync tab — BC-050 / Bug 23", () => {
  it("SyncTab_RendersFoldersAndDevices", async () => {
    renderSync();
    expect(await screen.findByTestId("sync-tab-folders")).toBeInTheDocument();
  });

  it("SyncTab_DispatchesLoadStatus_OnMount", async () => {
    const { getActions } = renderSync();
    await waitFor(() => expect(getActions().some((a) => a.type === LOAD_STATUS)).toBe(true));
  });

  it("SyncTab_Devices_PairingModal_DispatchesLoadPairing", async () => {
    const { getActions } = renderSync();
    const pairBtn = await screen.findByTestId("sync-pair-device-button");
    await userEvent.click(pairBtn);
    await waitFor(() => expect(getActions().some((a) => a.type === LOAD_PAIRING)).toBe(true));
  });

  it("SyncTab_EnableToggle_DispatchesSaveSettings", async () => {
    const { getActions } = renderSync({ settings: stubSettingsLoaded });
    await userEvent.click(screen.getByTestId("sync-tab-settings"));
    const toggle = await screen.findByTestId("sync-settings-enabled");
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(
        getActions().some((a) => a.type === SAVE_SETTINGS && a.payload?.syncthingEnabled === true)
      ).toBe(true)
    );
  });

  it("SyncTab_Conflicts_EmptyWhenBridgeMissing", async () => {
    renderSync();
    await userEvent.click(screen.getByTestId("sync-tab-conflicts"));
    expect(await screen.findByTestId("sync-conflicts-empty")).toBeInTheDocument();
  });
});
