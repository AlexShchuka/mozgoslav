import type { Reducer } from "redux";

import { ASK_FAILURE, ASK_PENDING, ASK_SUCCESS, type AskAction, SUBMIT_ASK } from "./actions";
import type { AskMessage } from "../../../features/Ask/types";

export interface AskState {
  messages: readonly AskMessage[];
  isAsking: boolean;
  error: string | null;
}

export const initialAskState: AskState = {
  messages: [],
  isAsking: false,
  error: null,
};

export const askReducer: Reducer<AskState> = (
  state: AskState = initialAskState,
  action
): AskState => {
  const typed = action as unknown as AskAction;
  switch (typed.type) {
    case SUBMIT_ASK:
      return { ...state, isAsking: true, error: null };

    case ASK_PENDING: {
      const pending: AskMessage = {
        id: typed.payload.pendingAssistantId,
        role: "assistant",
        content: "",
        citations: [],
        state: "pending",
      };
      return {
        ...state,
        messages: [...state.messages, typed.payload.userMessage, pending],
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
                content: typed.payload.answer,
                citations: typed.payload.citations,
                state: "done" as const,
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
            ? { ...m, content: typed.payload.message, state: "error" as const }
            : m
        ),
      };

    default:
      return state;
  }
};
