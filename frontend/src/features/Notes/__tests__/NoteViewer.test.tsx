import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NoteViewer from "../NoteViewer";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { watchNotesSagas, LOAD_NOTE, EXPORT_NOTE } from "../../../store/slices/notes";
import { renderWithStore, mockNotesState, notesById } from "../../../testUtils";
import "../../../i18n";

const buildNote = (patch: Partial<ProcessedNote> = {}): ProcessedNote => ({
  id: patch.id ?? "n1",
  transcriptId: patch.transcriptId ?? "t1",
  profileId: patch.profileId ?? "p1",
  version: patch.version ?? 1,
  summary: patch.summary ?? "Brief",
  keyPoints: patch.keyPoints ?? [],
  decisions: patch.decisions ?? [],
  actionItems: patch.actionItems ?? [],
  unresolvedQuestions: patch.unresolvedQuestions ?? [],
  participants: patch.participants ?? [],
  topic: patch.topic ?? "Speaker-aware demo",
  conversationType: patch.conversationType ?? "Meeting",
  cleanTranscript: patch.cleanTranscript ?? "",
  fullTranscript: patch.fullTranscript ?? "",
  tags: patch.tags ?? [],
  markdownContent: patch.markdownContent ?? "",
  exportedToVault: patch.exportedToVault ?? false,
  vaultPath: patch.vaultPath ?? null,
  createdAt: patch.createdAt ?? new Date().toISOString(),
});

const renderNoteViewer = (noteId: string, preloadedState?: Parameters<typeof mockNotesState>[0]) =>
  renderWithStore(
    <MemoryRouter initialEntries={[`/notes/${noteId}`]}>
      <Routes>
        <Route path="/notes/:id" element={<NoteViewer />} />
      </Routes>
    </MemoryRouter>,
    {
      preloadedState: mockNotesState(preloadedState),
      sagas: [watchNotesSagas],
    }
  );

describe("NoteViewer — dispatch-based", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("NoteViewer_OnMount_DispatchesLoadNote", () => {
    const { getActions } = renderNoteViewer("n1");
    expect(getActions().some((a) => a.type === LOAD_NOTE && a.payload === "n1")).toBe(true);
  });

  it("NoteViewer_ShowsLoading_WhenNoteNotInStore", () => {
    renderNoteViewer("n1", { byId: {} });
    expect(screen.getByText(/загружаем|loading/i)).toBeInTheDocument();
  });

  it("NoteViewer_RendersNote_WhenInStore", async () => {
    const note = buildNote({ id: "n1", summary: "", topic: "UniqueTopic456" });
    renderNoteViewer("n1", { byId: notesById([note]) });
    expect(await screen.findByText("UniqueTopic456")).toBeInTheDocument();
  });

  it("NoteViewer_Export_DispatchesExportNote", async () => {
    const note = buildNote({ id: "n1" });
    const { getActions } = renderNoteViewer("n1", { byId: notesById([note]) });

    const exportBtn = await screen.findByRole("button", { name: /экспорт|export to vault/i });
    await userEvent.click(exportBtn);

    expect(getActions().some((a) => a.type === EXPORT_NOTE && a.payload === "n1")).toBe(true);
  });

  it("NoteViewer_BackButton_IsPresent", async () => {
    const note = buildNote({ id: "n1" });
    renderNoteViewer("n1", { byId: notesById([note]) });
    expect(await screen.findByTestId("note-back")).toBeInTheDocument();
  });
});

describe("NoteViewer — T3 speaker-aware transcript", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders markdown speaker headers as bold text", async () => {
    const markdown = [
      "---",
      "type: conversation",
      "---",
      "",
      "## Full Transcript",
      "**Alice (00:03):**",
      "",
      "Привет.",
      "",
      "**Bob (00:05):**",
      "",
      "Здравствуйте, как дела?",
      "",
    ].join("\n");

    const note = buildNote({ id: "n1", markdownContent: markdown });
    renderNoteViewer("n1", { byId: notesById([note]) });

    await waitFor(() => {
      const strongNodes = screen.queryAllByText(
        (_, node) =>
          node?.tagName === "STRONG" &&
          (node.textContent === "Alice (00:03):" || node.textContent === "Bob (00:05):")
      );
      expect(strongNodes.length).toBe(2);
    });

    const strongNodes = screen.getAllByText(
      (_, node) =>
        node?.tagName === "STRONG" &&
        (node.textContent === "Alice (00:03):" || node.textContent === "Bob (00:05):")
    );
    const labels = strongNodes.map((n) => n.textContent).sort();
    expect(labels).toEqual(["Alice (00:03):", "Bob (00:05):"]);
  });
});
