import type { Reducer } from "redux";

import {
  ASK_FAILURE,
  ASK_PENDING,
  ASK_QUESTION,
  ASK_SUCCESS,
  LOAD_RAG_STATUS,
  LOAD_RAG_STATUS_FAILURE,
  LOAD_RAG_STATUS_SUCCESS,
  type RagAction,
  REINDEX_RAG,
  REINDEX_RAG_FAILURE,
  REINDEX_RAG_SUCCESS,
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

    case LOAD_RAG_STATUS:
      return { ...state, isLoadingStatus: true };

    case LOAD_RAG_STATUS_SUCCESS:
      return { ...state, isLoadingStatus: false, status: typed.payload };

    case LOAD_RAG_STATUS_FAILURE:
      return { ...state, isLoadingStatus: false };

    case REINDEX_RAG:
      return { ...state, isReindexing: true };

    case REINDEX_RAG_SUCCESS:
      return {
        ...state,
        isReindexing: false,
        lastReindexCount: typed.payload.embeddedNotes,
        status: state.status
          ? { ...state.status, embeddedNotes: typed.payload.embeddedNotes }
          : null,
      };

    case REINDEX_RAG_FAILURE:
      return { ...state, isReindexing: false };

    default:
      return state;
  }
};
