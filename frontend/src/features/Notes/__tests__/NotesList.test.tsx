import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";

import NotesList from "../NotesList";
import { api } from "../../../api/MozgoslavApi";
import { lightTheme } from "../../../styles/theme";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import "../../../i18n";

jest.mock("../../../api/MozgoslavApi", () => ({
  api: {
    listNotes: jest.fn(),
    createNote: jest.fn(),
  },
}));

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
  render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <NotesList />
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("NotesList — add note (BC-022 / Bug 4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("NotesList_AddNote_OpensEditor", async () => {
    (api.listNotes as jest.Mock).mockResolvedValue([]);

    renderNotes();

    const btn = await screen.findByTestId("notes-add-button");
    await userEvent.click(btn);

    expect(await screen.findByTestId("notes-add-title")).toBeInTheDocument();
    expect(screen.getByTestId("notes-add-body")).toBeInTheDocument();
  });

  it("NotesList_AddNote_SubmitsAndInserts", async () => {
    (api.listNotes as jest.Mock).mockResolvedValue([]);
    const created = buildNote({
      id: "new-1",
      topic: "handwritten",
      markdownContent: "Hello",
    });
    (api.createNote as jest.Mock).mockResolvedValue(created);

    renderNotes();

    await userEvent.click(await screen.findByTestId("notes-add-button"));
    await userEvent.type(screen.getByTestId("notes-add-title"), "handwritten");
    await userEvent.type(screen.getByTestId("notes-add-body"), "Hello");
    await userEvent.click(screen.getByTestId("notes-add-submit"));

    await waitFor(() =>
      expect(api.createNote).toHaveBeenCalledWith({
        title: "handwritten",
        body: "Hello",
      }),
    );
    // New note appears in the list
    expect(await screen.findByText("handwritten")).toBeInTheDocument();
  });

  it("NotesList_EmptyState", async () => {
    (api.listNotes as jest.Mock).mockResolvedValue([]);
    renderNotes();
    await waitFor(() =>
      expect(
        screen.getByText(/Пока пусто|Nothing here yet/),
      ).toBeInTheDocument(),
    );
  });
});
