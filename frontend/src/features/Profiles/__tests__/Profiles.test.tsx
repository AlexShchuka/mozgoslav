import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Profiles from "../Profiles";
import { Profile } from "../../../domain/Profile";
import { renderWithRouter } from "../../../testUtils";
import type { MockApiBundle } from "../../../testUtils";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

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

describe("Profiles — CRUD UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.profilesApi.list.mockResolvedValue([]);
  });

  it("Profiles_List_RendersWithBadges", async () => {
    mockApi.profilesApi.list.mockResolvedValue([
      buildProfile({ id: "b1", name: "Built-in", isBuiltIn: true, isDefault: true }),
      buildProfile({ id: "u1", name: "Mine", isBuiltIn: false }),
    ]);

    renderWithRouter(<Profiles />);

    expect(await screen.findByText("Built-in")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByTestId("profile-row-b1")).toHaveAttribute("data-builtin", "true");
    expect(screen.getByTestId("profile-row-u1")).toHaveAttribute("data-builtin", "false");
  });

  it("Profiles_Create_OpensEditor_PostsAndInserts", async () => {
    mockApi.profilesApi.list.mockResolvedValue([]);
    const created = buildProfile({ id: "new", name: "Fresh" });
    mockApi.profilesApi.create.mockResolvedValueOnce(created);
    mockApi.profilesApi.list.mockResolvedValueOnce([]).mockResolvedValue([created]);

    renderWithRouter(<Profiles />);

    await userEvent.click(await screen.findByTestId("profiles-create"));
    await userEvent.type(screen.getByTestId("profile-field-name"), "Fresh");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      expect(mockApi.profilesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Fresh" }),
      );
    });
    expect(await screen.findByText("Fresh")).toBeInTheDocument();
  });

  it("Profiles_Edit_OpensEditor_PutsAndRefreshes", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    mockApi.profilesApi.list.mockResolvedValue([existing]);
    mockApi.profilesApi.update.mockResolvedValueOnce({
      ...existing,
      name: "Mine-renamed",
    });

    renderWithRouter(<Profiles />);

    await userEvent.click(await screen.findByTestId("profile-row-edit-u1"));
    const nameField = screen.getByTestId("profile-field-name") as HTMLInputElement;
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Mine-renamed");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      expect(mockApi.profilesApi.update).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ name: "Mine-renamed" }),
      );
    });
  });

  it("Profiles_Duplicate_PostsAndInserts", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    const copy = buildProfile({ id: "u2", name: "Mine (copy)" });
    mockApi.profilesApi.list
      .mockResolvedValueOnce([existing])
      .mockResolvedValue([existing, copy]);
    mockApi.profilesApi.duplicate.mockResolvedValueOnce(copy);

    renderWithRouter(<Profiles />);

    await userEvent.click(await screen.findByTestId("profile-row-duplicate-u1"));

    await waitFor(() => {
      expect(mockApi.profilesApi.duplicate).toHaveBeenCalledWith("u1");
    });
    expect(await screen.findByText("Mine (copy)")).toBeInTheDocument();
  });

  it("Profiles_Delete_UserCreated_RemovesRow", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine", isBuiltIn: false });
    mockApi.profilesApi.list
      .mockResolvedValueOnce([existing])
      .mockResolvedValue([]);
    mockApi.profilesApi.remove.mockResolvedValueOnce(undefined);

    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    try {
      renderWithRouter(<Profiles />);

      await userEvent.click(await screen.findByTestId("profile-row-delete-u1"));

      await waitFor(() => {
        expect(mockApi.profilesApi.remove).toHaveBeenCalledWith("u1");
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
    mockApi.profilesApi.list.mockResolvedValue([builtIn]);

    mockApi.profilesApi.remove.mockRejectedValueOnce(
      new Error("Conflict: built-in profiles cannot be deleted"),
    );
    const { toast } = jest.requireMock("react-toastify") as {
      toast: { error: jest.Mock };
    };

    renderWithRouter(<Profiles />);

    const deleteBtn = await screen.findByTestId("profile-row-delete-b1");

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
    mockApi.profilesApi.list.mockResolvedValue([]);

    renderWithRouter(<Profiles />);

    await userEvent.click(await screen.findByTestId("profiles-create"));
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    expect(mockApi.profilesApi.create).not.toHaveBeenCalled();
    expect(await screen.findByTestId("profile-field-name-error")).toBeInTheDocument();
  });
});
