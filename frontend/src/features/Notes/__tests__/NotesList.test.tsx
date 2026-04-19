import {screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NotesList from "../NotesList";
import {ProcessedNote} from "../../../domain/ProcessedNote";
import type {MockApiBundle} from "../../../testUtils";
import {renderWithRouter} from "../../../testUtils";
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

describe("NotesList — add note (BC-022 / Bug 4)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("NotesList_AddNote_OpensEditor", async () => {
        mockApi.notesApi.list.mockResolvedValue([]);

        renderWithRouter(<NotesList/>);

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

        renderWithRouter(<NotesList/>);

        await userEvent.click(await screen.findByTestId("notes-add-button"));
        await userEvent.type(screen.getByTestId("notes-add-title"), "handwritten");
        await userEvent.type(screen.getByTestId("notes-add-body"), "Hello");
        await userEvent.click(screen.getByTestId("notes-add-submit"));

        await waitFor(() =>
            expect(mockApi.notesApi.create).toHaveBeenCalledWith({
                title: "handwritten",
                body: "Hello",
            }),
        );
        expect(await screen.findByText("handwritten")).toBeInTheDocument();
    });

    it("NotesList_EmptyState", async () => {
        mockApi.notesApi.list.mockResolvedValue([]);
        renderWithRouter(<NotesList/>);
        await waitFor(() =>
            expect(
                screen.getByText(/Пока пусто|Nothing here yet/),
            ).toBeInTheDocument(),
        );
    });
});
