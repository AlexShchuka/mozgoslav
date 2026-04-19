import type {RagAnswer, RagMessage} from "./types";

export const ASK_QUESTION = "rag/ASK_QUESTION";
export const ASK_PENDING = "rag/ASK_PENDING";
export const ASK_SUCCESS = "rag/ASK_SUCCESS";
export const ASK_FAILURE = "rag/ASK_FAILURE";
export const RESET_CHAT = "rag/RESET";

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

export type RagAction =
    | AskQuestionAction
    | AskPendingAction
    | AskSuccessAction
    | AskFailureAction
    | ResetChatAction;

export const askQuestion = (question: string, topK?: number): AskQuestionAction => ({
    type: ASK_QUESTION,
    payload: {question, topK},
});

export const askPending = (
    userMessage: RagMessage,
    pendingAssistantId: string,
): AskPendingAction => ({
    type: ASK_PENDING,
    payload: {userMessage, pendingAssistantId},
});

export const askSuccess = (assistantId: string, answer: RagAnswer): AskSuccessAction => ({
    type: ASK_SUCCESS,
    payload: {assistantId, answer},
});

export const askFailure = (assistantId: string, message: string): AskFailureAction => ({
    type: ASK_FAILURE,
    payload: {assistantId, message},
});

export const resetChat = (): ResetChatAction => ({type: RESET_CHAT});
