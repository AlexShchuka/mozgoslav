import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { PromptsContainer } from "../index";
import Prompts from "../Prompts";
import type { PromptTemplate } from "../../../domain/prompts";
import type { PromptsProps } from "../types";
import { renderWithStore, mockPromptsState, mergeMockState } from "../../../testUtils";
import {
  LOAD_PROMPTS,
  CREATE_PROMPT,
  UPDATE_PROMPT,
  DELETE_PROMPT,
  PREVIEW_PROMPT,
} from "../../../store/slices/prompts";
import "../../../i18n";

const buildTemplate = (patch: Partial<PromptTemplate> = {}): PromptTemplate => ({
  id: patch.id ?? "t1",
  name: patch.name ?? "My Template",
  body: patch.body ?? "Hello world",
  createdAt: patch.createdAt ?? "2026-04-28T10:00:00Z",
});

const noop = jest.fn();

const buildProps = (overrides: Partial<PromptsProps> = {}): PromptsProps => ({
  templates: [],
  isLoading: false,
  error: null,
  previewResult: null,
  isPreviewLoading: false,
  deletingIds: {},
  onLoad: noop,
  onCreate: noop,
  onUpdate: noop,
  onDelete: noop,
  onPreview: noop,
  onPreviewClear: noop,
  ...overrides,
});

const renderPromptsContainer = (templates: readonly PromptTemplate[] = []) =>
  renderWithStore(
    <MemoryRouter>
      <PromptsContainer />
    </MemoryRouter>,
    {
      preloadedState: mergeMockState(mockPromptsState({ templates: [...templates] })),
    }
  );

const renderPrompts = (props: Partial<PromptsProps> = {}) =>
  renderWithStore(
    <MemoryRouter>
      <Prompts {...buildProps(props)} />
    </MemoryRouter>
  );

describe("Prompts — CRUD UI", () => {
  beforeEach(() => {
    noop.mockClear();
  });

  it("Prompts_OnMount_DispatchesLoadPrompts", () => {
    const { getActions } = renderPromptsContainer();
    expect(getActions().some((a) => a.type === LOAD_PROMPTS)).toBe(true);
  });

  it("Prompts_EmptyList_ShowsEmptyState", () => {
    renderPrompts({ templates: [], isLoading: false });
    expect(screen.getByTestId("prompts-empty")).toBeInTheDocument();
  });

  it("Prompts_WithTemplates_RendersCards", () => {
    const templates = [
      buildTemplate({ id: "t1", name: "Template A" }),
      buildTemplate({ id: "t2", name: "Template B" }),
    ];
    renderPrompts({ templates });

    expect(screen.getByTestId("prompt-card-t1")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-card-t2")).toBeInTheDocument();
    expect(screen.getByText("Template A")).toBeInTheDocument();
    expect(screen.getByText("Template B")).toBeInTheDocument();
  });

  it("Prompts_CreateButton_OpensEditor", async () => {
    renderPrompts();

    await userEvent.click(screen.getByTestId("prompt-create-btn"));

    expect(screen.getByTestId("prompt-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-body-textarea")).toBeInTheDocument();
  });

  it("Prompts_Create_DispatchesCreatePrompt", async () => {
    const { getActions } = renderPromptsContainer();

    await userEvent.click(screen.getByTestId("prompt-create-btn"));
    await userEvent.type(screen.getByTestId("prompt-name-input"), "New Template");
    await userEvent.type(screen.getByTestId("prompt-body-textarea"), "Template body here");
    await userEvent.click(screen.getByTestId("prompt-save-btn"));

    await waitFor(() =>
      expect(
        getActions().some(
          (a) =>
            a.type === CREATE_PROMPT &&
            a.payload.name === "New Template" &&
            a.payload.body === "Template body here"
        )
      ).toBe(true)
    );
  });

  it("Prompts_Edit_OpensEditorWithExistingValues", async () => {
    const template = buildTemplate({ id: "t1", name: "My Template", body: "Hello world" });
    renderPrompts({ templates: [template] });

    await userEvent.click(screen.getByTestId("prompt-edit-t1"));

    const nameInput = screen.getByTestId("prompt-name-input") as HTMLInputElement;
    const bodyTextarea = screen.getByTestId("prompt-body-textarea") as HTMLTextAreaElement;
    expect(nameInput.value).toBe("My Template");
    expect(bodyTextarea.value).toBe("Hello world");
  });

  it("Prompts_Edit_DispatchesUpdatePrompt", async () => {
    const template = buildTemplate({ id: "t1", name: "My Template", body: "Old body" });
    const { getActions } = renderPromptsContainer([template]);

    await userEvent.click(screen.getByTestId("prompt-edit-t1"));
    const nameInput = screen.getByTestId("prompt-name-input") as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");
    await userEvent.click(screen.getByTestId("prompt-save-btn"));

    await waitFor(() =>
      expect(
        getActions().some(
          (a) => a.type === UPDATE_PROMPT && a.payload.id === "t1" && a.payload.name === "Renamed"
        )
      ).toBe(true)
    );
  });

  it("Prompts_Delete_DispatchesDeletePrompt", async () => {
    const template = buildTemplate({ id: "t1" });
    const { getActions } = renderPromptsContainer([template]);

    await userEvent.click(screen.getByTestId("prompt-delete-t1"));

    await waitFor(() =>
      expect(getActions().some((a) => a.type === DELETE_PROMPT && a.payload === "t1")).toBe(true)
    );
  });

  it("Prompts_TestRunner_DispatchesPreviewPrompt", async () => {
    const { getActions } = renderPromptsContainer();

    const textarea = screen.getByTestId("test-runner-body");
    await userEvent.type(textarea, "Simple preview text");
    const submitBtn = screen.getByTestId("test-runner-submit");
    expect(submitBtn).not.toBeDisabled();
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(
        getActions().some(
          (a) => a.type === PREVIEW_PROMPT && a.payload.templateBody === "Simple preview text"
        )
      ).toBe(true)
    );
  });

  it("Prompts_TestRunner_ShowsOutputWhenPreviewResult", () => {
    renderPrompts({ previewResult: "Resolved output text" });

    expect(screen.getByTestId("test-runner-output")).toBeInTheDocument();
    expect(screen.getByText("Resolved output text")).toBeInTheDocument();
  });

  it("Prompts_ErrorState_ShowsErrorText", () => {
    renderPrompts({ error: "Failed to load templates" });

    expect(screen.getByTestId("prompts-error")).toBeInTheDocument();
    expect(screen.getByText("Failed to load templates")).toBeInTheDocument();
  });
});
