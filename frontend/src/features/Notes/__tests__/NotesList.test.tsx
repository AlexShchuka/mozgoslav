import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NotesList from "../NotesList";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { watchNotesSagas } from "../../../store/slices/notes";
import { watchNotificationsSagas } from "../../../store/slices/notifications";
import { watchObsidianSagas } from "../../../store/slices/obsidian";
import { watchSettingsSagas } from "../../../store/slices/settings";
import { renderWithStore, mockNotesState, notesById, mergeMockState } from "../../../testUtils";
import { CREATE_NOTE, DELETE_NOTE, LOAD_NOTES } from "../../../store/slices/notes";
import "../../../i18n";

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const obsidianApi = {
    setup: jest.fn(),
    bulkExport: jest.fn(),
    applyLayout: jest.fn().mockResolvedValue({ createdFolders: 0, movedNotes: 0 }),
    detect: jest.fn(),
    restHealth: jest.fn(),
    diagnostics: jest.fn(),
    reapplyBootstrap: jest.fn(),
    reinstallPlugins: jest.fn(),
  };
  const settingsApi = {
    getSettings: jest.fn().mockResolvedValue({ vaultPath: "/tmp/vault" }),
    saveSettings: jest.fn(),
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

const buildNote = (patch: Partial<ProcessedNote>): ProcessedNote => ({
  id: patch.id ?? "n1",
  transcriptId: patch.transcriptId ?? "t1",
  profileId: patch.profileId ?? "p1",
  version: patch.version ?? 1,
  summary: patch.summary ?? "",
  keyPoints: patch.keyPoints ?? [],
  decisions: patch.decisions ?? [],
  actionItems: patch.actionItems ?? [],
  unresolvedQuestions: patch.unresolvedQuestions ?? [],
  participants: patch.participants ?? [],
  topic: patch.topic ?? "note",
  conversationType: patch.conversationType ?? "Idea",
  cleanTranscript: patch.cleanTranscript ?? "",
  fullTranscript: patch.fullTranscript ?? "",
  tags: patch.tags ?? [],
  markdownContent: patch.markdownContent ?? "",
  exportedToVault: patch.exportedToVault ?? false,
  vaultPath: patch.vaultPath ?? null,
  createdAt: patch.createdAt ?? new Date().toISOString(),
});

const renderNotes = (preloadedState?: Partial<ReturnType<typeof mergeMockState>>) =>
  renderWithStore(
    <MemoryRouter>
      <NotesList />
    </MemoryRouter>,
    {
      preloadedState,
      sagas: [watchNotesSagas, watchNotificationsSagas, watchObsidianSagas, watchSettingsSagas],
    }
  );

describe("NotesList — dispatch-based", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("NotesList_OnMount_DispatchesLoadNotes", () => {
    const { getActions } = renderNotes();
    expect(getActions().some((a) => a.type === LOAD_NOTES)).toBe(true);
  });

  it("NotesList_RendersNotesFromStore", async () => {
    const note1 = buildNote({ id: "n1", topic: "Alpha" });
    const note2 = buildNote({ id: "n2", topic: "Beta" });
    renderNotes(mockNotesState({ byId: notesById([note1, note2]) }));

    await screen.findByText(/Alpha/);
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
  });

  it("NotesList_EmptyState_WhenNoNotes", async () => {
    renderNotes(mockNotesState({ byId: {} }));
    await waitFor(() =>
      expect(screen.getByText(/Пока пусто|Nothing here yet/)).toBeInTheDocument()
    );
  });

  it("NotesList_DeleteConfirmed_DispatchesDeleteNote", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const note = buildNote({ id: "del-1", topic: "ToDelete" });
    const { getActions } = renderNotes(mockNotesState({ byId: notesById([note]) }));

    const deleteBtn = await screen.findByTestId("notes-delete-del-1");
    await userEvent.click(deleteBtn);

    expect(getActions().some((a) => a.type === DELETE_NOTE && a.payload === "del-1")).toBe(true);
  });

  it("NotesList_DeleteDeclined_DoesNotDispatch", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const note = buildNote({ id: "del-2", topic: "KeepMe" });
    const { getActions } = renderNotes(mockNotesState({ byId: notesById([note]) }));

    const deleteBtn = await screen.findByTestId("notes-delete-del-2");
    await userEvent.click(deleteBtn);

    expect(getActions().every((a) => a.type !== DELETE_NOTE)).toBe(true);
  });

  it("NotesList_SubmitCreate_DispatchesCreateNote", async () => {
    const { getActions } = renderNotes(mockNotesState());

    await userEvent.click(await screen.findByTestId("notes-add-button"));
    await userEvent.type(screen.getByTestId("notes-add-title"), "My note");
    await userEvent.type(screen.getByTestId("notes-add-body"), "Some body");
    await userEvent.click(screen.getByTestId("notes-add-submit"));

    expect(
      getActions().some(
        (a) =>
          a.type === CREATE_NOTE && a.payload.title === "My note" && a.payload.body === "Some body"
      )
    ).toBe(true);
  });
});

describe("NotesList — grouping by vault path folder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders folder headers derived from vaultPath", async () => {
    const notes = [
      buildNote({ id: "n1", topic: "Alpha", vaultPath: "/vault/Projects/Alpha.md" }),
      buildNote({ id: "n2", topic: "Beta", vaultPath: "/vault/Archive/Beta.md" }),
      buildNote({ id: "n3", topic: "Gamma", vaultPath: null }),
    ];

    jest.mock("../../../api", () => {
      const actual = jest.requireActual("../../../api");
      return {
        ...actual,
        apiFactory: {
          ...actual.apiFactory,
          createSettingsApi: () => ({
            getSettings: jest.fn().mockResolvedValue({ vaultPath: "/vault" }),
            saveSettings: jest.fn(),
            checkLlm: jest.fn(),
          }),
        },
      };
    });

    renderNotes(
      mergeMockState(mockNotesState({ byId: notesById(notes) }), {
        settings: {
          settings: { vaultPath: "/vault" } as never,
          isLoading: false,
          isSaving: false,
          llmProbe: { probing: false },
        },
      })
    );

    await screen.findByText(/Alpha/);
    expect(screen.getByRole("button", { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Без папки/ })).toBeInTheDocument();
  });
});

describe("NotesList — organize button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("disables organize when vault path is empty", async () => {
    renderNotes(
      mergeMockState(mockNotesState(), {
        settings: {
          settings: { vaultPath: "" } as never,
          isLoading: false,
          isSaving: false,
          llmProbe: { probing: false },
        },
      })
    );

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).toBeDisabled());
  });

  it("calls obsidian.applyLayout when vault path is configured", async () => {
    getObsidianApi().applyLayout.mockResolvedValue({ createdFolders: 0, movedNotes: 0 });

    renderNotes(
      mergeMockState(mockNotesState(), {
        settings: {
          settings: { vaultPath: "/vault" } as never,
          isLoading: false,
          isSaving: false,
          llmProbe: { probing: false },
        },
      })
    );

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).not.toBeDisabled());
    await userEvent.click(btn);

    await waitFor(() => expect(getObsidianApi().applyLayout).toHaveBeenCalledTimes(1));
  });
});
