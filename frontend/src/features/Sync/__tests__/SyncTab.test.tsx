import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import createSagaMiddleware from "redux-saga";
import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";
import { MemoryRouter } from "react-router-dom";

import Sync from "../Sync";
import {
  syncReducer,
  watchSyncSagas,
} from "../../../store/slices/sync";
import { lightTheme } from "../../../styles/theme";
import "../../../i18n";

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const settingsStub = {
    getSettings: jest.fn().mockResolvedValue({
      vaultPath: "",
      syncthingEnabled: false,
    }),
    saveSettings: jest.fn().mockResolvedValue({ syncthingEnabled: true }),
    checkLlm: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createSettingsApi: () => settingsStub,
    },
    __settingsStub: settingsStub,
  };
});

const settingsStub = (
  jest.requireMock("../../../api") as { __settingsStub: Record<string, jest.Mock> }
).__settingsStub;

const api = {
  saveSettings: settingsStub.saveSettings,
};

// Stub the SyncApi module so the saga doesn't reach out to an HTTP endpoint.
jest.mock("../../../api/SyncApi", () => ({
  syncApi: {
    // Return a seeded snapshot so the saga's initial load populates the store.
    getStatus: jest.fn().mockResolvedValue({
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
    }),
    getPairingPayload: jest
      .fn()
      .mockResolvedValue({ deviceId: "dev-1", folderIds: [], uri: "syncthing://" }),
    acceptDevice: jest.fn().mockResolvedValue(undefined),
  },
  createSyncEventSource: jest.fn().mockReturnValue({
    onopen: null,
    onerror: null,
    addEventListener: jest.fn(),
    close: jest.fn(),
  }),
}));

const buildStore = () => {
  const saga = createSagaMiddleware();
  function* root(): SagaIterator {
    yield all([fork(watchSyncSagas)]);
  }
  const rootReducer = (
    state: { sync: ReturnType<typeof syncReducer> } | undefined,
    action: { type: string },
  ) => ({
    sync: syncReducer(state?.sync, action),
  });
  const store = createStore(
    rootReducer as unknown as Parameters<typeof createStore>[0],
    applyMiddleware(saga),
  );
  saga.run(root);
  return store;
};

const renderSync = () => {
  const store = buildStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter>
          <Sync />
          <ToastContainer />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
};

describe("Sync tab — BC-050 / Bug 23", () => {
  beforeEach(() => jest.clearAllMocks());

  it("SyncTab_RendersFoldersAndDevices", async () => {
    renderSync();
    // Default tab = devices — wait for the saga load to settle.
    expect(await screen.findByTestId("sync-view-devices")).toBeInTheDocument();
    await screen.findByText("iPhone");

    // Folders tab
    await userEvent.click(screen.getByTestId("sync-tab-folders"));
    expect(await screen.findByTestId("sync-view-folders")).toBeInTheDocument();
    expect(screen.getByTestId("sync-folder-obsidian-vault")).toBeInTheDocument();
  });

  it("SyncTab_Folder_ShowsConflictBadge", async () => {
    renderSync();
    // Wait for devices render first so the saga has posted status.
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

  it("SyncTab_EnableToggle_CallsSettingsPut", async () => {
    renderSync();
    await userEvent.click(screen.getByTestId("sync-tab-settings"));
    const toggle = await screen.findByTestId("sync-settings-enabled");
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(api.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ syncthingEnabled: true }),
      ),
    );
  });

  it("SyncTab_Conflicts_EmptyWhenBridgeMissing", async () => {
    renderSync();
    await userEvent.click(screen.getByTestId("sync-tab-conflicts"));
    expect(await screen.findByTestId("sync-conflicts-empty")).toBeInTheDocument();
  });
});
