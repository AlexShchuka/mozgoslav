import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Sync from "../Sync";
import { watchSyncSagas } from "../../../store/slices/sync";
import { watchSettingsSagas, SAVE_SETTINGS } from "../../../store/slices/settings";
import { DEFAULT_SETTINGS } from "../../../domain/Settings";
import { renderWithStore, mockSettingsState } from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const stubSettingsLoaded = { ...DEFAULT_SETTINGS, syncthingEnabled: false };

const renderSync = (settingsPatch: Parameters<typeof mockSettingsState>[0] = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Sync />
    </MemoryRouter>,
    {
      preloadedState: mockSettingsState(settingsPatch),
      sagas: [watchSyncSagas, watchSettingsSagas],
    }
  );

describe("Sync tab — BC-050 / Bug 23", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("syncStatus")) {
        return Promise.resolve({
          syncStatus: {
            folders: [
              { id: "obsidian-vault", state: "idle", completionPct: 87, conflicts: 3 },
              { id: "backup", state: "syncing", completionPct: 40, conflicts: 0 },
            ],
            devices: [
              {
                id: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                name: "iPhone",
                connected: true,
                lastSeen: null,
              },
              {
                id: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
                name: "Desktop",
                connected: false,
                lastSeen: null,
              },
            ],
          },
        });
      }
      if (docStr.includes("syncPairingPayload")) {
        return Promise.resolve({
          syncPairingPayload: {
            deviceId: "dev-1",
            folderIds: [],
            uri: "syncthing://",
          },
        });
      }
      return Promise.resolve({});
    });
  });

  it("SyncTab_RendersFoldersAndDevices", async () => {
    renderSync();
    expect(await screen.findByTestId("sync-view-devices")).toBeInTheDocument();
    await screen.findByText("iPhone");

    await userEvent.click(screen.getByTestId("sync-tab-folders"));
    expect(await screen.findByTestId("sync-view-folders")).toBeInTheDocument();
    expect(screen.getByTestId("sync-folder-obsidian-vault")).toBeInTheDocument();
  });

  it("SyncTab_Folder_ShowsConflictBadge", async () => {
    renderSync();
    await screen.findByTestId("sync-view-devices");
    await userEvent.click(screen.getByTestId("sync-tab-folders"));
    const badge = await screen.findByTestId("sync-folder-conflict-obsidian-vault");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");
  });

  it("SyncTab_Devices_PairingModal_Reuses_SyncPairing", async () => {
    renderSync();
    const pairBtn = await screen.findByTestId("sync-pair-device-button");
    await userEvent.click(pairBtn);
    expect(await screen.findByTestId("sync-pairing-modal-body")).toBeInTheDocument();
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
