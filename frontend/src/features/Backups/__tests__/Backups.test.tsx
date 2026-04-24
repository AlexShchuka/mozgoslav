import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Backups from "../index";
import { renderWithStore, mockBackupsState, mergeMockState } from "../../../testUtils";
import { LOAD_BACKUPS, CREATE_BACKUP } from "../../../store/slices/backups";
import type { BackupFile } from "../../../store/slices/backups";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const buildBackup = (patch: Partial<BackupFile> = {}): BackupFile => ({
  name: patch.name ?? "backup-2024-01-01.zip",
  path: patch.path ?? "/path/to/backup-2024-01-01.zip",
  sizeBytes: patch.sizeBytes ?? 1048576,
  createdAt: patch.createdAt ?? "2024-01-01T00:00:00Z",
});

const renderBackups = (backups: readonly BackupFile[] = []) =>
  renderWithStore(<Backups />, {
    preloadedState: mergeMockState(mockBackupsState({ items: [...backups] })),
  });

describe("Backups", () => {
  it("Backups_OnMount_DispatchesLoadBackups", () => {
    const { getActions } = renderBackups();
    expect(getActions().some((a) => a.type === LOAD_BACKUPS)).toBe(true);
  });

  it("Backups_RendersItemsFromStore", () => {
    const backups = [
      buildBackup({ name: "backup-one.zip", path: "/p/one.zip" }),
      buildBackup({ name: "backup-two.zip", path: "/p/two.zip" }),
    ];
    renderBackups(backups);

    expect(screen.getByText("backup-one.zip")).toBeInTheDocument();
    expect(screen.getByText("backup-two.zip")).toBeInTheDocument();
  });

  it("Backups_CreateClick_DispatchesCreateBackup", async () => {
    const { getActions } = renderBackups();
    await userEvent.click(screen.getByRole("button", { name: /создать бэкап/i }));
    expect(getActions().some((a) => a.type === CREATE_BACKUP)).toBe(true);
  });

  it("Backups_EmptyState", () => {
    renderBackups([]);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

export {};
