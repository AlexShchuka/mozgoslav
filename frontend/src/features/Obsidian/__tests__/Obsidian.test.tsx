import {screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";
import {ToastContainer} from "react-toastify";

import Obsidian from "../index";
import {watchObsidianSagas} from "../../../store/slices/obsidian";
import {watchSettingsSagas} from "../../../store/slices/settings";
import type {MockApiBundle} from "../../../testUtils";
import {renderWithStore} from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api", () => {
    const actual = jest.requireActual("../../../api");
    const {
        createMockApi,
    } = jest.requireActual("../../../testUtils/mockApi") as typeof import("../../../testUtils/mockApi");
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

const renderObsidian = () =>
    renderWithStore(
        <MemoryRouter>
            <Obsidian/>
            <ToastContainer/>
        </MemoryRouter>,
        {sagas: [watchObsidianSagas, watchSettingsSagas]},
    );

describe("Obsidian — first-class tab (BC-025 / Bug 22)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockApi.settingsApi.getSettings.mockResolvedValue({
            vaultPath: "/tmp/vault",
        } as never);
        mockApi.settingsApi.saveSettings.mockResolvedValue({} as never);
        mockApi.obsidianApi.setup.mockResolvedValue({createdPaths: []});
    });

    it("Obsidian_SyncAll_CallsBulkExport", async () => {
        mockApi.obsidianApi.bulkExport.mockResolvedValue({exportedCount: 3});

        renderObsidian();

        const btn = await screen.findByTestId("obsidian-sync-all");
        await userEvent.click(btn);

        await waitFor(() => expect(mockApi.obsidianApi.bulkExport).toHaveBeenCalledTimes(1));
    });

    it("Obsidian_ApplyLayout_ShowsCounts_ToastSuccess", async () => {
        mockApi.obsidianApi.applyLayout.mockResolvedValue({
            createdFolders: 2,
            movedNotes: 7,
        });

        renderObsidian();

        const btn = await screen.findByTestId("obsidian-apply-layout");
        await userEvent.click(btn);

        await waitFor(() => expect(mockApi.obsidianApi.applyLayout).toHaveBeenCalledTimes(1));
        await waitFor(() => {
            expect(screen.getByText(/2/)).toBeInTheDocument();
            expect(screen.getByText(/7/)).toBeInTheDocument();
        });
    });
});
