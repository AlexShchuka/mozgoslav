import { expectSaga } from "redux-saga-test-plan";

import {
  askFailure,
  askPending,
  askQuestion,
  askSuccess,
  loadRagStatus,
  loadRagStatusFailure,
  loadRagStatusSuccess,
  reindexRag,
  reindexRagFailure,
  reindexRagSuccess,
} from "../actions";
import { ragReducer } from "../reducer";
import { askQuestionSaga } from "../saga";
import { loadRagStatusSaga } from "../saga/loadRagStatusSaga";
import { reindexRagSaga } from "../saga/reindexRagSaga";
import type { RagMessage } from "../types";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const dispatch = (action: unknown) => action as Parameters<typeof ragReducer>[1];

const seedUserMessage: RagMessage = {
  id: "u1",
  role: "user",
  content: "hi",
  citations: [],
  state: "done",
  llmAvailable: true,
};

describe("rag saga — askQuestion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts ASK_PENDING then ASK_SUCCESS on happy path, keeping citations", async () => {
    mockedRequest.mockResolvedValueOnce({
      ragQuery: {
        answer: "Short answer.",
        llmAvailable: true,
        citations: [{ noteId: "n1", segmentId: "c1", text: "quoted text" }],
      },
    });

    const result = await expectSaga(askQuestionSaga, askQuestion("What?"))
      .withReducer(ragReducer)
      .run();

    const storeState = result.storeState;
    expect(storeState.messages).toHaveLength(2);
    expect(storeState.messages[0]!.role).toBe("user");
    expect(storeState.messages[0]!.content).toBe("What?");
    expect(storeState.messages[1]!.role).toBe("assistant");
    expect(storeState.messages[1]!.state).toBe("done");
    expect(storeState.messages[1]!.content).toBe("Short answer.");
    expect(storeState.messages[1]!.citations).toHaveLength(1);
    expect(storeState.isAsking).toBe(false);
  });

  it("puts ASK_FAILURE on error and keeps the user message in history", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network down"));

    const result = await expectSaga(askQuestionSaga, askQuestion("Boom"))
      .withReducer(ragReducer)
      .run();

    const storeState = result.storeState;
    expect(storeState.messages).toHaveLength(2);
    expect(storeState.messages[0]!.content).toBe("Boom");
    expect(storeState.messages[1]!.state).toBe("error");
    expect(storeState.messages[1]!.content).toBe("network down");
    expect(storeState.isAsking).toBe(false);
    expect(storeState.error).toBe("network down");
  });

  it("reducer — ASK_PENDING appends both user and pending-assistant messages", () => {
    const state = ragReducer(undefined, dispatch(askPending(seedUserMessage, "a1")));
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]!.state).toBe("pending");
  });

  it("reducer — ASK_SUCCESS replaces pending-assistant content and llmAvailable flag", () => {
    const seeded = ragReducer(undefined, dispatch(askPending(seedUserMessage, "a1")));
    const state = ragReducer(
      seeded,
      dispatch(askSuccess("a1", { answer: "ok", llmAvailable: false, citations: [] }))
    );
    const assistant = state.messages.find((m) => m.id === "a1")!;
    expect(assistant.content).toBe("ok");
    expect(assistant.state).toBe("done");
    expect(assistant.llmAvailable).toBe(false);
  });

  it("reducer — ASK_FAILURE marks assistant message as error", () => {
    const seeded = ragReducer(undefined, dispatch(askPending(seedUserMessage, "a1")));
    const state = ragReducer(seeded, dispatch(askFailure("a1", "blown up")));
    const assistant = state.messages.find((m) => m.id === "a1")!;
    expect(assistant.state).toBe("error");
    expect(assistant.content).toBe("blown up");
  });
});

describe("rag saga — loadRagStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts LOAD_STATUS_SUCCESS with status on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      ragStatus: { embeddedNotes: 10, chunks: 50 },
    });

    const result = await expectSaga(loadRagStatusSaga)
      .withReducer(ragReducer)
      .dispatch(loadRagStatus())
      .run();

    const storeState = result.storeState;
    expect(storeState.status).toEqual({ embeddedNotes: 10, chunks: 50 });
    expect(storeState.isLoadingStatus).toBe(false);
  });

  it("puts LOAD_STATUS_FAILURE and clears isLoadingStatus on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    const result = await expectSaga(loadRagStatusSaga)
      .withReducer(ragReducer)
      .dispatch(loadRagStatus())
      .run();

    const storeState = result.storeState;
    expect(storeState.status).toBeNull();
    expect(storeState.isLoadingStatus).toBe(false);
  });

  it("reducer — LOAD_RAG_STATUS sets isLoadingStatus true", () => {
    const state = ragReducer(undefined, dispatch(loadRagStatus()));
    expect(state.isLoadingStatus).toBe(true);
  });

  it("reducer — LOAD_RAG_STATUS_SUCCESS sets status and clears flag", () => {
    const seeded = ragReducer(undefined, dispatch(loadRagStatus()));
    const state = ragReducer(
      seeded,
      dispatch(loadRagStatusSuccess({ embeddedNotes: 5, chunks: 20 }))
    );
    expect(state.status).toEqual({ embeddedNotes: 5, chunks: 20 });
    expect(state.isLoadingStatus).toBe(false);
  });

  it("reducer — LOAD_RAG_STATUS_FAILURE clears flag and preserves prior status", () => {
    const withStatus = ragReducer(
      undefined,
      dispatch(loadRagStatusSuccess({ embeddedNotes: 5, chunks: 20 }))
    );
    const state = ragReducer(withStatus, dispatch(loadRagStatusFailure("err")));
    expect(state.status).toEqual({ embeddedNotes: 5, chunks: 20 });
    expect(state.isLoadingStatus).toBe(false);
  });
});

describe("rag saga — reindexRag", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts REINDEX_SUCCESS and notifySuccess on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      ragReindex: { embeddedNotes: 42, chunks: 200, errors: [] },
    });

    const result = await expectSaga(reindexRagSaga)
      .withReducer(ragReducer)
      .dispatch(reindexRag())
      .run();

    const storeState = result.storeState;
    expect(storeState.isReindexing).toBe(false);
    expect(storeState.lastReindexCount).toBe(42);
  });

  it("puts REINDEX_FAILURE and clears isReindexing on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("reindex failed"));

    const result = await expectSaga(reindexRagSaga)
      .withReducer(ragReducer)
      .dispatch(reindexRag())
      .run();

    const storeState = result.storeState;
    expect(storeState.isReindexing).toBe(false);
    expect(storeState.lastReindexCount).toBeNull();
  });

  it("reducer — REINDEX_RAG sets isReindexing true", () => {
    const state = ragReducer(undefined, dispatch(reindexRag()));
    expect(state.isReindexing).toBe(true);
  });

  it("reducer — REINDEX_RAG_SUCCESS sets lastReindexCount and clears flag", () => {
    const seeded = ragReducer(undefined, dispatch(reindexRag()));
    const state = ragReducer(seeded, dispatch(reindexRagSuccess(77)));
    expect(state.lastReindexCount).toBe(77);
    expect(state.isReindexing).toBe(false);
  });

  it("reducer — REINDEX_RAG_FAILURE clears isReindexing without altering lastReindexCount", () => {
    const withCount = ragReducer(undefined, dispatch(reindexRagSuccess(5)));
    const seeded = ragReducer(withCount, dispatch(reindexRag()));
    const state = ragReducer(seeded, dispatch(reindexRagFailure("boom")));
    expect(state.isReindexing).toBe(false);
    expect(state.lastReindexCount).toBe(5);
  });
});
