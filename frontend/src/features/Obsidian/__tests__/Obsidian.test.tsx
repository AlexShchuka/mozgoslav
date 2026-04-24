import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import Obsidian from "../index";
import { watchNotificationsSagas } from "../../../store/slices/notifications";
import { watchObsidianSagas } from "../../../store/slices/obsidian";
import { watchSettingsSagas } from "../../../store/slices/settings";
import { renderWithStore } from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const obsidianApi = {
    setup: jest.fn(),
    bulkExport: jest.fn(),
    applyLayout: jest.fn(),
    detect: jest.fn(),
    restHealth: jest.fn(),
    diagnostics: jest.fn(),
    reapplyBootstrap: jest.fn(),
    reinstallPlugins: jest.fn(),
  };
  const settingsApi = {
    getSettings: jest.fn().mockResolvedValue({ vaultPath: "/tmp/vault" }),
    saveSettings: jest.fn().mockResolvedValue({}),
    checkLlm: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createObsidianApi: () => obsidianApi,
      createSettingsApi: () => settingsApi,
    },
    __obsidianApi: obsidianApi,
    __settingsApi: settingsApi,
  };
});

const getObsidianApi = () =>
  (jest.requireMock("../../../api") as { __obsidianApi: Record<string, jest.Mock> }).__obsidianApi;
const getSettingsApi = () =>
  (jest.requireMock("../../../api") as { __settingsApi: Record<string, jest.Mock> }).__settingsApi;

const renderObsidian = () =>
  renderWithStore(
    <MemoryRouter>
      <Obsidian />
      <ToastContainer />
    </MemoryRouter>,
    { sagas: [watchNotificationsSagas, watchObsidianSagas, watchSettingsSagas] }
  );

describe("Obsidian — first-class tab (BC-025 / Bug 22)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSettingsApi().getSettings.mockResolvedValue({ vaultPath: "/tmp/vault" });
    getSettingsApi().saveSettings.mockResolvedValue({});
    getObsidianApi().setup.mockResolvedValue({ createdPaths: [] });
  });

  it("Obsidian_SyncAll_CallsBulkExport", async () => {
    getObsidianApi().bulkExport.mockResolvedValue({
      exportedCount: 3,
      skippedCount: 0,
      failures: [],
    });

    renderObsidian();

    const btn = await screen.findByTestId("obsidian-sync-all");
    await userEvent.click(btn);

    await waitFor(() => expect(getObsidianApi().bulkExport).toHaveBeenCalledTimes(1));
  });

  it("Obsidian_ApplyLayout_ShowsCounts_ToastSuccess", async () => {
    getObsidianApi().applyLayout.mockResolvedValue({
      createdFolders: 2,
      movedNotes: 7,
    });

    renderObsidian();

    const btn = await screen.findByTestId("obsidian-apply-layout");
    await userEvent.click(btn);

    await waitFor(() => expect(getObsidianApi().applyLayout).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/7/)).toBeInTheDocument();
    });
  });
});
