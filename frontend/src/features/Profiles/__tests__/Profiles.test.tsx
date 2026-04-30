import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Profiles from "../index";
import type { Profile } from "../../../domain/Profile";
import {
  renderWithStore,
  mockProfilesState,
  profilesById,
  mergeMockState,
} from "../../../testUtils";
import {
  LOAD_PROFILES,
  CREATE_PROFILE,
  UPDATE_PROFILE,
  DELETE_PROFILE,
  DUPLICATE_PROFILE,
} from "../../../store/slices/profiles";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const buildProfile = (patch: Partial<Profile> = {}): Profile => ({
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
  glossaryByLanguage: patch.glossaryByLanguage ?? {},
  llmCorrectionEnabled: patch.llmCorrectionEnabled ?? false,
  llmProviderOverride: patch.llmProviderOverride ?? "",
  llmModelOverride: patch.llmModelOverride ?? "",
});

const renderProfiles = (profiles: readonly Profile[] = []) => {
  const allProfiles = profilesById(profiles);
  const order = profiles.map((p) => p.id);
  return renderWithStore(
    <MemoryRouter>
      <Profiles />
    </MemoryRouter>,
    {
      preloadedState: mergeMockState(mockProfilesState({ profiles: allProfiles, order })),
    }
  );
};

describe("Profiles — CRUD UI", () => {
  it("Profiles_OnMount_DispatchesLoadProfiles", () => {
    const { getActions } = renderProfiles();
    expect(getActions().some((a) => a.type === LOAD_PROFILES)).toBe(true);
  });

  it("Profiles_List_RendersWithBadges", () => {
    const profiles = [
      buildProfile({ id: "b1", name: "Built-in", isBuiltIn: true, isDefault: true }),
      buildProfile({ id: "u1", name: "Mine", isBuiltIn: false }),
    ];

    renderProfiles(profiles);

    expect(screen.getByText("Built-in")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByTestId("profile-row-b1")).toHaveAttribute("data-builtin", "true");
    expect(screen.getByTestId("profile-row-u1")).toHaveAttribute("data-builtin", "false");
  });

  it("Profiles_Create_OpensEditor_DispatchesCreateProfile", async () => {
    const { getActions } = renderProfiles();

    await userEvent.click(screen.getByTestId("profiles-create"));
    await userEvent.type(screen.getByTestId("profile-field-name"), "Fresh");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() =>
      expect(
        getActions().some((a) => a.type === CREATE_PROFILE && a.payload.name === "Fresh")
      ).toBe(true)
    );
  });

  it("Profiles_Edit_OpensEditor_DispatchesUpdateProfile", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    const { getActions } = renderProfiles([existing]);

    await userEvent.click(screen.getByTestId("profile-row-edit-u1"));
    const nameField = screen.getByTestId("profile-field-name") as HTMLInputElement;
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Mine-renamed");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() =>
      expect(
        getActions().some(
          (a) =>
            a.type === UPDATE_PROFILE &&
            a.payload.id === "u1" &&
            a.payload.draft.name === "Mine-renamed"
        )
      ).toBe(true)
    );
  });

  it("Profiles_Duplicate_DispatchesDuplicateProfile", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine" });
    const { getActions } = renderProfiles([existing]);

    await userEvent.click(screen.getByTestId("profile-row-duplicate-u1"));

    await waitFor(() =>
      expect(getActions().some((a) => a.type === DUPLICATE_PROFILE && a.payload.id === "u1")).toBe(
        true
      )
    );
  });

  it("Profiles_Delete_UserCreated_DispatchesDeleteProfile", async () => {
    const existing = buildProfile({ id: "u1", name: "Mine", isBuiltIn: false });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    try {
      const { getActions } = renderProfiles([existing]);

      await userEvent.click(screen.getByTestId("profile-row-delete-u1"));

      await waitFor(() =>
        expect(getActions().some((a) => a.type === DELETE_PROFILE && a.payload.id === "u1")).toBe(
          true
        )
      );
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("Profiles_Delete_BuiltIn_ButtonIsDisabled", () => {
    const builtIn = buildProfile({ id: "b1", name: "Built-in", isBuiltIn: true });
    renderProfiles([builtIn]);

    const deleteBtn = screen.getByTestId("profile-row-delete-b1");
    expect(deleteBtn).toBeDisabled();
    expect(screen.getByText("Built-in")).toBeInTheDocument();
  });

  it("ProfileEditor_SubmitEmptyName_ShowsValidation", async () => {
    renderProfiles();

    await userEvent.click(screen.getByTestId("profiles-create"));
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    expect(await screen.findByTestId("profile-field-name-error")).toBeInTheDocument();
  });
});

export {};
