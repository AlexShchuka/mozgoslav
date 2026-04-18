import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";

import NoteViewer from "../NoteViewer";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { renderWithRouter } from "../../../testUtils";
import type { MockApiBundle } from "../../../testUtils";
import "../../../i18n";

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

const buildSpeakerNote = (): ProcessedNote => ({
  id: "n1",
  transcriptId: "t1",
  profileId: "p1",
  version: 1,
  summary: "Brief",
  keyPoints: [],
  decisions: [],
  actionItems: [],
  unresolvedQuestions: [],
  participants: ["Alice", "Bob"],
  topic: "Speaker-aware demo",
  conversationType: "Meeting",
  cleanTranscript: "",
  fullTranscript: "",
  tags: [],
  markdownContent: [
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
  ].join("\n"),
  exportedToVault: false,
  vaultPath: null,
  createdAt: new Date().toISOString(),
});

describe("NoteViewer — T3 speaker-aware transcript", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders markdown speaker headers as bold text", async () => {
    const note = buildSpeakerNote();
    mockApi.notesApi.getById.mockResolvedValue(note);

    renderWithRouter(
      <Routes>
        <Route path="/notes/:id" element={<NoteViewer />} />
      </Routes>,
      { initialEntries: ["/notes/n1"] },
    );

    await waitFor(() =>
      expect(mockApi.notesApi.getById).toHaveBeenCalledWith("n1"),
    );

    // The markdown speaker header renders as a <strong>. Match by tag so we
    // don't double-count the wrapping <p>.
    const strongNodes = await screen.findAllByText(
      (_, node) =>
        node?.tagName === "STRONG" &&
        (node.textContent === "Alice (00:03):" || node.textContent === "Bob (00:05):"),
    );
    const labels = strongNodes.map((n) => n.textContent).sort();
    expect(labels).toEqual(["Alice (00:03):", "Bob (00:05):"]);
  });
});
