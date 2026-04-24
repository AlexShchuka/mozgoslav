import type { Reducer } from "redux";

import {
  ASK_FAILURE,
  ASK_PENDING,
  ASK_QUESTION,
  ASK_SUCCESS,
  type RagAction,
  RESET_CHAT,
} from "./actions";
import { initialRagState, type RagMessage, type RagState } from "./types";

export const ragReducer: Reducer<RagState> = (
  state: RagState = initialRagState,
  action
): RagState => {
  const typed = action as RagAction;
  switch (typed.type) {
    case ASK_QUESTION:
      return { ...state, isAsking: true, error: null };

    case ASK_PENDING: {
      const pendingAssistant: RagMessage = {
        id: typed.payload.pendingAssistantId,
        role: "assistant",
        content: "",
        citations: [],
        state: "pending",
        llmAvailable: true,
      };
      return {
        ...state,
        messages: [...state.messages, typed.payload.userMessage, pendingAssistant],
      };
    }

    case ASK_SUCCESS:
      return {
        ...state,
        isAsking: false,
        error: null,
        messages: state.messages.map((m) =>
          m.id === typed.payload.assistantId
            ? {
                ...m,
                content: typed.payload.answer.answer,
                citations: typed.payload.answer.citations,
                state: "done" as const,
                llmAvailable: typed.payload.answer.llmAvailable,
              }
            : m
        ),
      };

    case ASK_FAILURE:
      return {
        ...state,
        isAsking: false,
        error: typed.payload.message,
        messages: state.messages.map((m) =>
          m.id === typed.payload.assistantId
            ? {
                ...m,
                content: typed.payload.message,
                state: "error" as const,
                llmAvailable: false,
              }
            : m
        ),
      };

    case RESET_CHAT:
      return initialRagState;

    default:
      return state;
  }
};
