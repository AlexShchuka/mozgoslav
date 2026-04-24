import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import type { SagaIterator } from "redux-saga";
import createSagaMiddleware from "redux-saga";
import { all, fork } from "redux-saga/effects";
import { ThemeProvider } from "styled-components";
import { ToastContainer } from "react-toastify";
import { MemoryRouter } from "react-router-dom";

import Sync from "../Sync";
import { syncReducer, watchSyncSagas } from "../../../store/slices/sync";
import { lightTheme } from "../../../styles/theme";
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

const stubSettings = {
  vaultPath: "",
  llmProvider: "",
  llmEndpoint: "",
  llmModel: "",
  llmApiKey: "",
  obsidianApiHost: "",
  obsidianApiToken: "",
  whisperModelPath: "",
  vadModelPath: "",
  language: "ru",
  themeMode: "system",
  whisperThreads: 4,
  dictationEnabled: false,
  dictationHotkeyType: "mouse",
  dictationMouseButton: 4,
  dictationKeyboardHotkey: "",
  dictationPushToTalk: false,
  dictationLanguage: "ru",
  dictationWhisperModelId: "",
  dictationCaptureSampleRate: 16000,
  dictationLlmPolish: false,
  dictationInjectMode: "auto",
  dictationOverlayEnabled: true,
  dictationOverlayPosition: "bottom-center",
  dictationSoundFeedback: true,
  dictationVocabulary: [],
  dictationModelUnloadMinutes: 10,
  dictationTempAudioPath: "",
  dictationAppProfiles: [],
  syncthingEnabled: false,
  syncthingObsidianVaultPath: "",
  obsidianFeatureEnabled: false,
};

const buildStore = () => {
  const saga = createSagaMiddleware();

  function* root(): SagaIterator {
    yield all([fork(watchSyncSagas)]);
  }

  const rootReducer = (
    state: { sync: ReturnType<typeof syncReducer> } | undefined,
    action: { type: string }
  ) => ({
    sync: syncReducer(state?.sync, action),
  });
  const store = createStore(
    rootReducer as unknown as Parameters<typeof createStore>[0],
    applyMiddleware(saga)
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
    </Provider>
  );
};

describe("Sync tab — BC-050 / Bug 23", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockImplementation((doc: unknown) => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes("QuerySettings")) {
        return Promise.resolve({ settings: stubSettings });
      }
      if (docStr.includes("MutationUpdateSettings")) {
        return Promise.resolve({
          updateSettings: { settings: { ...stubSettings, syncthingEnabled: true } },
        });
      }
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

  it("SyncTab_EnableToggle_CallsSettingsMutation", async () => {
    renderSync();
    await userEvent.click(screen.getByTestId("sync-tab-settings"));
    const toggle = await screen.findByTestId("sync-settings-enabled");
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "Document" }),
        expect.objectContaining({
          input: expect.objectContaining({ syncthingEnabled: true }),
        })
      )
    );
  });

  it("SyncTab_Conflicts_EmptyWhenBridgeMissing", async () => {
    renderSync();
    await userEvent.click(screen.getByTestId("sync-tab-conflicts"));
    expect(await screen.findByTestId("sync-conflicts-empty")).toBeInTheDocument();
  });
});
