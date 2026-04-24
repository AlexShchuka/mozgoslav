import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";

import NoteViewer from "../NoteViewer";
import { ProcessedNote } from "../../../domain/ProcessedNote";
import { renderWithRouter } from "../../../testUtils";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

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
    mockedRequest.mockResolvedValue({ note });

    renderWithRouter(
      <Routes>
        <Route path="/notes/:id" element={<NoteViewer />} />
      </Routes>,
      { initialEntries: ["/notes/n1"] }
    );

    await waitFor(() => expect(mockedRequest).toHaveBeenCalled());

    const strongNodes = await screen.findAllByText(
      (_, node) =>
        node?.tagName === "STRONG" &&
        (node.textContent === "Alice (00:03):" || node.textContent === "Bob (00:05):")
    );
    const labels = strongNodes.map((n) => n.textContent).sort();
    expect(labels).toEqual(["Alice (00:03):", "Bob (00:05):"]);
  });
});
