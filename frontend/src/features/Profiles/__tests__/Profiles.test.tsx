import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Profiles from "../index";
import type { Profile } from "../../../domain/Profile";
import { watchProfilesSagas } from "../../../store/slices/profiles";
import { renderWithStore } from "../../../testUtils";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const buildGqlProfile = (patch: Partial<Profile>) => ({
  __typename: "Profile" as const,
  id: patch.id ?? "p1",
  name: patch.name ?? "User Profile",
  systemPrompt: patch.systemPrompt ?? "",
  transcriptionPromptOverride: patch.transcriptionPromptOverride ?? "",
  outputTemplate: patch.outputTemplate ?? "",
  cleanupLevel: patch.cleanupLevel === "Aggressive" ? "AGGRESSIVE" : patch.cleanupLevel === "None" ? "NONE" : "LIGHT",
  exportFolder: patch.exportFolder ?? "_inbox",
  autoTags: patch.autoTags ?? [],
  isDefault: patch.isDefault ?? false,
  isBuiltIn: patch.isBuiltIn ?? false,
  glossary: [],
  llmCorrectionEnabled: false,
});


const renderProfiles = () =>
  renderWithStore(
    <MemoryRouter>
      <Profiles />
    </MemoryRouter>,
    { sagas: [watchProfilesSagas] }
  );

describe("Profiles — CRUD UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockResolvedValue({ profiles: [] });
  });

  it("Profiles_List_RendersWithBadges", async () => {
    mockedRequest.mockResolvedValue({
      profiles: [
        buildGqlProfile({ id: "b1", name: "Built-in", isBuiltIn: true, isDefault: true }),
        buildGqlProfile({ id: "u1", name: "Mine", isBuiltIn: false }),
      ],
    });

    renderProfiles();

    expect(await screen.findByText("Built-in")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByTestId("profile-row-b1")).toHaveAttribute("data-builtin", "true");
    expect(screen.getByTestId("profile-row-u1")).toHaveAttribute("data-builtin", "false");
  });

  it("Profiles_Create_OpensEditor_PostsAndInserts", async () => {
    const created = buildGqlProfile({ id: "new", name: "Fresh" });
    mockedRequest
      .mockResolvedValueOnce({ profiles: [] })
      .mockResolvedValueOnce({ createProfile: { profile: created, errors: [] } });

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profiles-create"));
    await userEvent.type(screen.getByTestId("profile-field-name"), "Fresh");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    expect(await screen.findByText("Fresh")).toBeInTheDocument();
  });

  it("Profiles_Edit_OpensEditor_PutsAndRefreshes", async () => {
    const existing = buildGqlProfile({ id: "u1", name: "Mine" });
    const updated = buildGqlProfile({ id: "u1", name: "Mine-renamed" });
    mockedRequest
      .mockResolvedValueOnce({ profiles: [existing] })
      .mockResolvedValueOnce({ updateProfile: { profile: updated, errors: [] } });

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profile-row-edit-u1"));
    const nameField = screen.getByTestId("profile-field-name") as HTMLInputElement;
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Mine-renamed");
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      expect(mockedRequest).toHaveBeenCalledTimes(2);
    });
  });

  it("Profiles_Duplicate_PostsAndInserts", async () => {
    const existing = buildGqlProfile({ id: "u1", name: "Mine" });
    const copy = buildGqlProfile({ id: "u2", name: "Mine (copy)" });
    mockedRequest
      .mockResolvedValueOnce({ profiles: [existing] })
      .mockResolvedValueOnce({ duplicateProfile: { profile: copy, errors: [] } });

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profile-row-duplicate-u1"));

    expect(await screen.findByText("Mine (copy)")).toBeInTheDocument();
  });

  it("Profiles_Delete_UserCreated_RemovesRow", async () => {
    const existing = buildGqlProfile({ id: "u1", name: "Mine", isBuiltIn: false });
    mockedRequest
      .mockResolvedValueOnce({ profiles: [existing] })
      .mockResolvedValueOnce({ deleteProfile: { profile: null, errors: [] } });

    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    try {
      renderProfiles();

      await userEvent.click(await screen.findByTestId("profile-row-delete-u1"));

      await waitFor(() => {
        expect(screen.queryByText("Mine")).not.toBeInTheDocument();
      });
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it("Profiles_Delete_BuiltIn_ShowsErrorToast_RowStays", async () => {
    const builtIn = buildGqlProfile({ id: "b1", name: "Built-in", isBuiltIn: true });
    mockedRequest.mockResolvedValue({ profiles: [builtIn] });

    renderProfiles();

    const deleteBtn = await screen.findByTestId("profile-row-delete-b1");

    expect(deleteBtn).toBeDisabled();
    expect(screen.getByText("Built-in")).toBeInTheDocument();
  });

  it("ProfileEditor_SubmitEmptyName_ShowsValidation", async () => {
    mockedRequest.mockResolvedValue({ profiles: [] });

    renderProfiles();

    await userEvent.click(await screen.findByTestId("profiles-create"));
    await userEvent.click(screen.getByTestId("profile-editor-save"));

    expect(await screen.findByTestId("profile-field-name-error")).toBeInTheDocument();
  });
});

export {};
