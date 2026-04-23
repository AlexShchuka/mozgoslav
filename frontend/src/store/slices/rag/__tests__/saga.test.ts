import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import type { RagAnswer } from "../../../../domain/Rag";
import { askFailure, askPending, askQuestion, askSuccess } from "../actions";
import { ragReducer } from "../reducer";
import { askQuestionSaga } from "../saga";
import type { RagMessage } from "../types";

jest.mock("../../../../api", () => {
  const actual = jest.requireActual("../../../../api");
  const ragStub = {
    query: jest.fn(),
    reindex: jest.fn(),
  };
  return {
    ...actual,
    apiFactory: {
      ...actual.apiFactory,
      createRagApi: () => ragStub,
    },
    __ragStub: ragStub,
  };
});

const ragStub = (jest.requireMock("../../../../api") as { __ragStub: Record<string, jest.Mock> })
  .__ragStub;

const api = {
  ragQuery: ragStub.query,
};

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
    const answer: RagAnswer = {
      answer: "Short answer.",
      llmAvailable: true,
      citations: [{ noteId: "n1", chunkId: "c1", text: "quoted text", score: 0.91 }],
    };
    api.ragQuery.mockResolvedValueOnce(answer);

    const result = await expectSaga(askQuestionSaga, askQuestion("What?"))
      .withReducer(ragReducer)
      .provide([[matchers.call.fn(api.ragQuery), answer]])
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
    const result = await expectSaga(askQuestionSaga, askQuestion("Boom"))
      .withReducer(ragReducer)
      .provide([[matchers.call.fn(api.ragQuery), throwError(new Error("network down"))]])
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
