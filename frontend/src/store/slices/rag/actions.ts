import type { RagAnswer, RagMessage, RagStatus } from "./types";

export const ASK_QUESTION = "rag/ASK_QUESTION";
export const ASK_PENDING = "rag/ASK_PENDING";
export const ASK_SUCCESS = "rag/ASK_SUCCESS";
export const ASK_FAILURE = "rag/ASK_FAILURE";
export const RESET_CHAT = "rag/RESET";

export const LOAD_RAG_STATUS = "rag/LOAD_STATUS";
export const LOAD_RAG_STATUS_SUCCESS = "rag/LOAD_STATUS_SUCCESS";
export const LOAD_RAG_STATUS_FAILURE = "rag/LOAD_STATUS_FAILURE";

export const REINDEX_RAG = "rag/REINDEX";
export const REINDEX_RAG_SUCCESS = "rag/REINDEX_SUCCESS";
export const REINDEX_RAG_FAILURE = "rag/REINDEX_FAILURE";

export interface AskQuestionAction {
  type: typeof ASK_QUESTION;
  payload: { question: string; topK?: number };
}

export interface AskPendingAction {
  type: typeof ASK_PENDING;
  payload: { userMessage: RagMessage; pendingAssistantId: string };
}

export interface AskSuccessAction {
  type: typeof ASK_SUCCESS;
  payload: { assistantId: string; answer: RagAnswer };
}

export interface AskFailureAction {
  type: typeof ASK_FAILURE;
  payload: { assistantId: string; message: string };
}

export interface ResetChatAction {
  type: typeof RESET_CHAT;
}

export interface LoadRagStatusAction {
  type: typeof LOAD_RAG_STATUS;
}

export interface LoadRagStatusSuccessAction {
  type: typeof LOAD_RAG_STATUS_SUCCESS;
  payload: RagStatus;
}

export interface LoadRagStatusFailureAction {
  type: typeof LOAD_RAG_STATUS_FAILURE;
  payload: string;
}

export interface ReindexRagAction {
  type: typeof REINDEX_RAG;
}

export interface ReindexRagSuccessAction {
  type: typeof REINDEX_RAG_SUCCESS;
  payload: { readonly embeddedNotes: number };
}

export interface ReindexRagFailureAction {
  type: typeof REINDEX_RAG_FAILURE;
  payload: string;
}

export type RagAction =
  | AskQuestionAction
  | AskPendingAction
  | AskSuccessAction
  | AskFailureAction
  | ResetChatAction
  | LoadRagStatusAction
  | LoadRagStatusSuccessAction
  | LoadRagStatusFailureAction
  | ReindexRagAction
  | ReindexRagSuccessAction
  | ReindexRagFailureAction;

export const askQuestion = (question: string, topK?: number): AskQuestionAction => ({
  type: ASK_QUESTION,
  payload: { question, topK },
});

export const askPending = (
  userMessage: RagMessage,
  pendingAssistantId: string
): AskPendingAction => ({
  type: ASK_PENDING,
  payload: { userMessage, pendingAssistantId },
});

export const askSuccess = (assistantId: string, answer: RagAnswer): AskSuccessAction => ({
  type: ASK_SUCCESS,
  payload: { assistantId, answer },
});

export const askFailure = (assistantId: string, message: string): AskFailureAction => ({
  type: ASK_FAILURE,
  payload: { assistantId, message },
});

export const resetChat = (): ResetChatAction => ({ type: RESET_CHAT });

export const loadRagStatus = (): LoadRagStatusAction => ({ type: LOAD_RAG_STATUS });
export const loadRagStatusSuccess = (status: RagStatus): LoadRagStatusSuccessAction => ({
  type: LOAD_RAG_STATUS_SUCCESS,
  payload: status,
});
export const loadRagStatusFailure = (message: string): LoadRagStatusFailureAction => ({
  type: LOAD_RAG_STATUS_FAILURE,
  payload: message,
});

export const reindexRag = (): ReindexRagAction => ({ type: REINDEX_RAG });
export const reindexRagSuccess = (embeddedNotes: number): ReindexRagSuccessAction => ({
  type: REINDEX_RAG_SUCCESS,
  payload: { embeddedNotes },
});
export const reindexRagFailure = (message: string): ReindexRagFailureAction => ({
  type: REINDEX_RAG_FAILURE,
  payload: message,
});
