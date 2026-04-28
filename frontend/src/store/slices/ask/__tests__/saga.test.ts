import { expectSaga } from "redux-saga-test-plan";

import { askFailure, askPending, askSuccess, submitAsk } from "../actions";
import { askReducer } from "../reducer";
import { submitAskSaga } from "../saga";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const dispatch = (action: unknown) => action as Parameters<typeof askReducer>[1];

describe("ask saga — submitAsk", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts ASK_PENDING then ASK_SUCCESS with answer and citations on happy path", async () => {
    mockedRequest.mockResolvedValueOnce({
      unifiedSearch: {
        answer: "42 is the answer.",
        citations: [{ source: "Corpus", reference: "note1", snippet: "a snippet", url: null }],
      },
    });

    const result = await expectSaga(submitAskSaga, submitAsk("What is the answer?", false))
      .withReducer(askReducer)
      .run();

    const state = result.storeState;
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]!.role).toBe("user");
    expect(state.messages[0]!.content).toBe("What is the answer?");
    expect(state.messages[1]!.role).toBe("assistant");
    expect(state.messages[1]!.state).toBe("done");
    expect(state.messages[1]!.content).toBe("42 is the answer.");
    expect(state.messages[1]!.citations).toHaveLength(1);
    expect(state.messages[1]!.citations[0]!.source).toBe("Corpus");
    expect(state.isAsking).toBe(false);
  });

  it("puts ASK_FAILURE on network error, keeps user message in history", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network down"));

    const result = await expectSaga(submitAskSaga, submitAsk("Boom", false))
      .withReducer(askReducer)
      .run();

    const state = result.storeState;
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]!.content).toBe("Boom");
    expect(state.messages[1]!.state).toBe("error");
    expect(state.messages[1]!.content).toBe("network down");
    expect(state.isAsking).toBe(false);
    expect(state.error).toBe("network down");
  });

  it("web citations are mapped correctly when includeWeb is true", async () => {
    mockedRequest.mockResolvedValueOnce({
      unifiedSearch: {
        answer: "News answer.",
        citations: [
          {
            source: "Web",
            reference: "Some Title",
            snippet: "web snippet",
            url: "https://example.com",
          },
        ],
      },
    });

    const result = await expectSaga(submitAskSaga, submitAsk("latest news", true))
      .withReducer(askReducer)
      .run();

    const citation = result.storeState.messages[1]!.citations[0]!;
    expect(citation.source).toBe("Web");
    expect(citation.url).toBe("https://example.com");
  });

  it("reducer — SUBMIT_ASK sets isAsking true", () => {
    const state = askReducer(undefined, dispatch(submitAsk("q", false)));
    expect(state.isAsking).toBe(true);
    expect(state.error).toBeNull();
  });

  it("reducer — ASK_PENDING appends user and pending assistant messages", () => {
    const userMessage = {
      id: "u1",
      role: "user" as const,
      content: "hello",
      citations: [],
      state: "done" as const,
    };
    const state = askReducer(undefined, dispatch(askPending(userMessage, "a1")));
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]!.state).toBe("pending");
    expect(state.messages[1]!.id).toBe("a1");
  });

  it("reducer — ASK_SUCCESS replaces pending assistant with answer and citations", () => {
    const userMessage = {
      id: "u1",
      role: "user" as const,
      content: "q",
      citations: [],
      state: "done" as const,
    };
    const seeded = askReducer(undefined, dispatch(askPending(userMessage, "a1")));
    const citations = [{ source: "Corpus" as const, reference: "n1", snippet: "s", url: null }];
    const state = askReducer(seeded, dispatch(askSuccess("a1", "the answer", citations)));
    const assistant = state.messages.find((m) => m.id === "a1")!;
    expect(assistant.content).toBe("the answer");
    expect(assistant.state).toBe("done");
    expect(assistant.citations).toHaveLength(1);
    expect(state.isAsking).toBe(false);
  });

  it("reducer — ASK_FAILURE marks assistant message as error", () => {
    const userMessage = {
      id: "u1",
      role: "user" as const,
      content: "q",
      citations: [],
      state: "done" as const,
    };
    const seeded = askReducer(undefined, dispatch(askPending(userMessage, "a1")));
    const state = askReducer(seeded, dispatch(askFailure("a1", "exploded")));
    const assistant = state.messages.find((m) => m.id === "a1")!;
    expect(assistant.state).toBe("error");
    expect(assistant.content).toBe("exploded");
    expect(state.error).toBe("exploded");
    expect(state.isAsking).toBe(false);
  });
});
