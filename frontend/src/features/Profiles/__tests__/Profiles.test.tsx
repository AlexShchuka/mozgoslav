import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import Profiles from "../Profiles";
import { api } from "../../../api/MozgoslavApi";
import { lightTheme } from "../../../styles/theme";
import { Profile } from "../../../domain/Profile";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../../api/MozgoslavApi", () => ({
  api: {
    listProfiles: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    duplicateProfile: jest.fn(),
  },
}));

const buildProfile = (patch: Partial<Profile>): Profile => ({
  id: patch.id ?? "p1",
  name: patch.name ?? "User Profile",
  systemPrompt: patch.systemPrompt ?? "",
  transcriptionPromptOverride: patch.transcriptionPromptOverride ?? "",
  outputTemplate: patch.outputTemplate ?? "",
  cleanupLevel: patch.cleanupLevel ?? "Light",
  exportFolder: patch.exportFolder ?? "_inbox",
  autoTags: patch.autoTags ?? [],
  isDefault: patch.isDefault ?? false,
  isBuiltIn: patch.isBuiltIn ?? false,
});

const renderProfiles = () =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <Profiles />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("Profiles — CRUD UI (TODO-4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.listProfiles as jest.Mock).mockResolvedValue([]);
  });

  it("Profiles_List_RendersWithBadges", async () => {
    (api.listProfiles as jest.Mock).mockResolvedValue([
      buildProfile({ id: "b1", name: "Built-in", isBuiltIn: true, isDefault: true }),
      buildProfile({ id: "u1", name: "Mine", isBuiltIn: false }),
    ]);

    renderProfiles();

    expect(await screen.findByText("Built-in")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    // Built-in row carries both badges; user row carries none
    expect(screen.getByTestId("profile-row-b1")).toHaveAttribute("data-builtin", "true");
    expect(screen.getByTestId("profile-row-u1")).toHaveAttribute("data-builtin", "false");
  });

  it("Profiles_Create_OpensEditor_PostsAndInserts", async () => {
    (api.listProfiles as jest.Mock).mockResolvedValue([]);
    const created = buildProfile({ id: "new", name: "Fresh" });
    (api.createProfile as jest.Mock).mockResolvedValueOnce(created);
    (api.listProfiles as jest.Mock).mockResolvedValueOnce([]).mockResolvedValue([created]);

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profiles-create"));
    await userEvent.type(screen.getByTestId("profile-field-name"), "Fresh");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      expect(api.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Fresh" }),
      );
    });
    expect(await screen.findByText("Fresh")).toBeInTheDocument();
  });

  it("Profiles_Edit_OpensEditor_PutsAndRefreshes", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    (api.listProfiles as jest.Mock).mockResolvedValue([existing]);
    (api.updateProfile as jest.Mock).mockResolvedValueOnce({
      ...existing,
      name: "Mine-renamed",
    });

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profile-row-edit-u1"));
    const nameField = screen.getByTestId("profile-field-name") as HTMLInputElement;
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Mine-renamed");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ name: "Mine-renamed" }),
      );
    });
  });

  it("Profiles_Duplicate_PostsAndInserts", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    const copy = buildProfile({ id: "u2", name: "Mine (copy)" });
    (api.listProfiles as jest.Mock)
      .mockResolvedValueOnce([existing])
      .mockResolvedValue([existing, copy]);
    (api.duplicateProfile as jest.Mock).mockResolvedValueOnce(copy);

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profile-row-duplicate-u1"));

    await waitFor(() => {
      expect(api.duplicateProfile).toHaveBeenCalledWith("u1");
    });
    expect(await screen.findByText("Mine (copy)")).toBeInTheDocument();
  });

  it("Profiles_Delete_UserCreated_RemovesRow", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine", isBuiltIn: false });
    (api.listProfiles as jest.Mock)
      .mockResolvedValueOnce([existing])
      .mockResolvedValue([]);
    (api.deleteProfile as jest.Mock).mockResolvedValueOnce(undefined);

    // Auto-confirm the window.confirm dialog
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    try {
      renderProfiles();

      await userEvent.click(await screen.findByTestId("profile-row-delete-u1"));

      await waitFor(() => {
        expect(api.deleteProfile).toHaveBeenCalledWith("u1");
      });
      await waitFor(() => {
        expect(screen.queryByText("Mine")).not.toBeInTheDocument();
      });
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("Profiles_Delete_BuiltIn_ShowsErrorToast_RowStays", async () => {
    const builtIn = buildProfile({ id: "b1", name: "Built-in", isBuiltIn: true });
    (api.listProfiles as jest.Mock).mockResolvedValue([builtIn]);

    // Either the delete button is disabled or the server answers 409 —
    // either way the row must stay put. We simulate the 409 path.
    (api.deleteProfile as jest.Mock).mockRejectedValueOnce(
      new Error("Conflict: built-in profiles cannot be deleted"),
    );
    const { toast } = jest.requireMock("react-toastify") as {
      toast: { error: jest.Mock };
    };

    renderProfiles();

    const deleteBtn = await screen.findByTestId("profile-row-delete-b1");

    // Built-in row: either disabled (preferred) or invokes the API and fails.
    if (!(deleteBtn as HTMLButtonElement).disabled) {
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
      try {
        await userEvent.click(deleteBtn);
        await waitFor(() => expect(toast.error).toHaveBeenCalled());
      } finally {
        confirmSpy.mockRestore();
      }
    }

    expect(screen.getByText("Built-in")).toBeInTheDocument();
  });

  it("ProfileEditor_SubmitEmptyName_ShowsValidation", async () => {
    (api.listProfiles as jest.Mock).mockResolvedValue([]);

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profiles-create"));
    // Do not type any name — submit.
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    // The editor should show a validation message and not call createProfile.
    expect(api.createProfile).not.toHaveBeenCalled();
    expect(await screen.findByTestId("profile-field-name-error")).toBeInTheDocument();
  });
});
