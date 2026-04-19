import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter, Route, Routes} from "react-router-dom";
import {Provider} from "react-redux";
import {applyMiddleware, createStore} from "redux";
import type {SagaIterator} from "redux-saga";
import createSagaMiddleware from "redux-saga";
import {all, fork} from "redux-saga/effects";
import {ThemeProvider} from "styled-components";

import RagChat from "../src/features/RagChat";
import {ragReducer, watchRagSagas} from "../src/store/slices/rag";
import {lightTheme} from "../src/styles/theme";
import "../src/i18n";

const ragQueryMock = jest.fn();

jest.mock("../src/api", () => {
    const actual = jest.requireActual("../src/api");
    return {
        ...actual,
        apiFactory: {
            ...actual.apiFactory,
            createRagApi: () => ({query: ragQueryMock, reindex: jest.fn()}),
        },
    };
});

const buildStore = () => {
    const saga = createSagaMiddleware();

    function* root(): SagaIterator {
        yield all([fork(watchRagSagas)]);
    }

    const rootReducer = (
        state: { rag: ReturnType<typeof ragReducer> } | undefined,
        action: { type: string },
    ) => ({
        rag: ragReducer(state?.rag, action),
    });
    const store = createStore(
        rootReducer as unknown as Parameters<typeof createStore>[0],
        applyMiddleware(saga),
    );
    saga.run(root);
    return store;
};

const renderChat = () => {
    const store = buildStore();
    return render(
        <Provider store={store}>
            <ThemeProvider theme={lightTheme}>
                <MemoryRouter initialEntries={["/rag"]}>
                    <Routes>
                        <Route path="/rag" element={<RagChat/>}/>
                        <Route
                            path="/notes/:id"
                            element={<div data-testid="note-viewer-stub">note</div>}
                        />
                    </Routes>
                </MemoryRouter>
            </ThemeProvider>
        </Provider>,
    );
};

describe("RagChat", () => {
    beforeEach(() => jest.clearAllMocks());

    it("shows the placeholder and empty state on first paint", () => {
        renderChat();
        expect(screen.getByTestId("rag-input")).toHaveAttribute(
            "placeholder",
            expect.stringMatching(/Привет|Hi/),
        );
        expect(
            screen.getByText(/Спроси что-нибудь|Ask anything about your notes/),
        ).toBeInTheDocument();
    });

    it("submits a question and renders the answer with a citation chip", async () => {
        ragQueryMock.mockResolvedValue({
            answer: "На встрече обсудили Q2-план.",
            llmAvailable: true,
            citations: [{noteId: "n1", chunkId: "c1", text: "план Q2", score: 0.9}],
        });

        renderChat();
        const input = screen.getByTestId("rag-input");
        await userEvent.type(input, "Что было на встрече?{Enter}");

        await waitFor(() =>
            expect(screen.getByText("На встрече обсудили Q2-план.")).toBeInTheDocument(),
        );
        expect(ragQueryMock).toHaveBeenCalledWith("Что было на встрече?", undefined);
        expect(screen.getByText("Что было на встрече?")).toBeInTheDocument();
        expect(screen.getByTestId("rag-citation")).toBeInTheDocument();
    });

    it("surfaces the LLM-unreachable banner and still shows raw citations", async () => {
        ragQueryMock.mockResolvedValue({
            answer: "",
            llmAvailable: false,
            citations: [{noteId: "n2", chunkId: "c2", text: "цитата", score: 0.8}],
        });

        renderChat();
        const input = screen.getByTestId("rag-input");
        await userEvent.type(input, "Q{Enter}");

        expect(
            await screen.findByText(/LLM недоступен|LLM unavailable/),
        ).toBeInTheDocument();
        expect(screen.getByTestId("rag-citation")).toBeInTheDocument();
    });

    it("navigates to the note when a citation chip is clicked", async () => {
        ragQueryMock.mockResolvedValue({
            answer: "ok",
            llmAvailable: true,
            citations: [{noteId: "note-xyz", chunkId: "c9", text: "t", score: 0.5}],
        });

        renderChat();
        const input = screen.getByTestId("rag-input");
        await userEvent.type(input, "Q{Enter}");

        const chip = await screen.findByTestId("rag-citation");
        await userEvent.click(chip);
        await waitFor(() =>
            expect(screen.getByTestId("note-viewer-stub")).toBeInTheDocument(),
        );
    });
});
