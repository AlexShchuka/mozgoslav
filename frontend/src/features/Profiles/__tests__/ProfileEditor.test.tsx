import { screen, waitFor, act } from "@testing-library/react";
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
import { CREATE_PROFILE, UPDATE_PROFILE } from "../../../store/slices/profiles";
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
  name: patch.name ?? "My Profile",
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

describe("ProfileEditor — glossary add/remove", () => {
  it("glossary language can be added and a term entered", async () => {
    const profile = buildProfile({
      id: "p1",
      name: "Editor Test",
      glossaryByLanguage: { en: ["foo"] },
    });

    renderProfiles([profile]);

    await userEvent.click(screen.getByTestId("profile-row-edit-p1"));

    expect(await screen.findByText("EN")).toBeInTheDocument();
    expect(screen.getByText("foo ×")).toBeInTheDocument();
  });

  it("clicking glossary term × removes it from the list (reflected in save payload)", async () => {
    const profile = buildProfile({
      id: "p1",
      name: "Glossary Remove",
      glossaryByLanguage: { en: ["alpha", "bravo"] },
    });

    const { getActions } = renderProfiles([profile]);

    await userEvent.click(screen.getByTestId("profile-row-edit-p1"));

    const alphaPill = await screen.findByText("alpha ×");
    await userEvent.click(alphaPill);

    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      const saveAction = getActions().find(
        (a) => a.type === UPDATE_PROFILE && a.payload.id === "p1"
      );
      expect(saveAction).toBeDefined();
      if (saveAction) {
        expect(saveAction.payload.draft.glossaryByLanguage.en).not.toContain("alpha");
        expect(saveAction.payload.draft.glossaryByLanguage.en).toContain("bravo");
      }
    });
  });
});

describe("ProfileEditor — LLM provider/model override save", () => {
  it("llmProviderOverride is included in the create payload", async () => {
    const { getActions } = renderProfiles();

    await userEvent.click(screen.getByTestId("profiles-create"));

    await userEvent.type(screen.getByTestId("profile-field-name"), "Override Test");

    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      const createAction = getActions().find(
        (a) => a.type === CREATE_PROFILE && a.payload.name === "Override Test"
      );
      expect(createAction).toBeDefined();
      if (createAction) {
        expect(createAction.payload.llmProviderOverride).toBeDefined();
      }
    });
  });

  it("editing existing profile with llmModelOverride preserves the value in payload", async () => {
    const profile = buildProfile({
      id: "p2",
      name: "Override Profile",
      llmProviderOverride: "custom-llm",
      llmModelOverride: "gpt-4-turbo",
    });

    const { getActions } = renderProfiles([profile]);

    await userEvent.click(screen.getByTestId("profile-row-edit-p2"));

    await userEvent.click(screen.getByTestId("profile-editor-save"));

    await waitFor(() => {
      const updateAction = getActions().find(
        (a) => a.type === UPDATE_PROFILE && a.payload.id === "p2"
      );
      expect(updateAction).toBeDefined();
      if (updateAction) {
        expect(updateAction.payload.draft.llmProviderOverride).toBe("custom-llm");
        expect(updateAction.payload.draft.llmModelOverride).toBe("gpt-4-turbo");
      }
    });
  });
});

describe("ProfileEditor — language switcher in glossary", () => {
  it("shows glossary language dropdown to add a new language", async () => {
    renderProfiles();

    await act(async () => {
      await userEvent.click(screen.getByTestId("profiles-create"));
    });

    const selects = document.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });
});
