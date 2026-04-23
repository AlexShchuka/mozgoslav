import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NotesList from "../NotesList";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { watchNotificationsSagas } from "../../../store/slices/notifications";
import { watchObsidianSagas } from "../../../store/slices/obsidian";
import { watchSettingsSagas } from "../../../store/slices/settings";
import type { MockApiBundle } from "../../../testUtils";
import { renderWithStore } from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api", () => {
  const actual = jest.requireActual("../../../api");
  const { createMockApi } = jest.requireActual(
    "../../../testUtils/mockApi"
  ) as typeof import("../../../testUtils/mockApi");
  const bundle = createMockApi();
  return {
    ...actual,
    apiFactory: bundle.factory,
    __bundle: bundle,
  };
});

const mockApi = (jest.requireMock("../../../api") as { __bundle: MockApiBundle }).__bundle;

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

const renderNotes = () =>
  renderWithStore(
    <MemoryRouter>
      <NotesList />
    </MemoryRouter>,
    { sagas: [watchNotificationsSagas, watchObsidianSagas, watchSettingsSagas] }
  );

describe("NotesList — add note (BC-022 / Bug 4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.settingsApi.getSettings.mockResolvedValue({
      vaultPath: "/tmp/vault",
    } as never);
  });

  it("NotesList_AddNote_OpensEditor", async () => {
    mockApi.notesApi.list.mockResolvedValue([]);

    renderNotes();

    const btn = await screen.findByTestId("notes-add-button");
    await userEvent.click(btn);

    expect(await screen.findByTestId("notes-add-title")).toBeInTheDocument();
    expect(screen.getByTestId("notes-add-body")).toBeInTheDocument();
  });

  it("NotesList_AddNote_SubmitsAndInserts", async () => {
    mockApi.notesApi.list.mockResolvedValue([]);
    const created = buildNote({
      id: "new-1",
      topic: "handwritten",
      markdownContent: "Hello",
    });
    mockApi.notesApi.create.mockResolvedValue(created);

    renderNotes();

    await userEvent.click(await screen.findByTestId("notes-add-button"));
    await userEvent.type(screen.getByTestId("notes-add-title"), "handwritten");
    await userEvent.type(screen.getByTestId("notes-add-body"), "Hello");
    await userEvent.click(screen.getByTestId("notes-add-submit"));

    await waitFor(() =>
      expect(mockApi.notesApi.create).toHaveBeenCalledWith({
        title: "handwritten",
        body: "Hello",
      })
    );
    expect(await screen.findByText(/handwritten/)).toBeInTheDocument();
  });

  it("NotesList_EmptyState", async () => {
    mockApi.notesApi.list.mockResolvedValue([]);
    renderNotes();
    await waitFor(() =>
      expect(screen.getByText(/Пока пусто|Nothing here yet/)).toBeInTheDocument()
    );
  });
});

describe("NotesList — grouping by vault path folder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.settingsApi.getSettings.mockResolvedValue({
      vaultPath: "/vault",
    } as never);
  });

  it("renders folder headers derived from vaultPath and click opens note", async () => {
    mockApi.notesApi.list.mockResolvedValue([
      buildNote({ id: "n1", topic: "Alpha", vaultPath: "/vault/Projects/Alpha.md" }),
      buildNote({ id: "n2", topic: "Beta", vaultPath: "/vault/Archive/Beta.md" }),
      buildNote({ id: "n3", topic: "Gamma", vaultPath: null }),
    ]);

    renderNotes();

    await screen.findByText(/Alpha/);
    expect(screen.getByRole("button", { name: /Projects/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Без папки/ })).toBeInTheDocument();
  });
});

describe("NotesList — organize button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.notesApi.list.mockResolvedValue([]);
  });

  it("disables organize when vault path is empty", async () => {
    mockApi.settingsApi.getSettings.mockResolvedValue({ vaultPath: "" } as never);
    renderNotes();

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).toBeDisabled());
  });

  it("calls obsidian.applyLayout when vault path is configured", async () => {
    mockApi.settingsApi.getSettings.mockResolvedValue({
      vaultPath: "/vault",
    } as never);
    mockApi.obsidianApi.applyLayout.mockResolvedValue({
      createdFolders: 0,
      movedNotes: 0,
    });

    renderNotes();

    const btn = await screen.findByTestId("notes-organize");
    await waitFor(() => expect(btn).not.toBeDisabled());
    await userEvent.click(btn);

    await waitFor(() => expect(mockApi.obsidianApi.applyLayout).toHaveBeenCalledTimes(1));
  });
});
