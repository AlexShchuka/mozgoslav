import type { AskMessage, UnifiedCitation } from "../../../features/Ask/types";

export const SUBMIT_ASK = "ask/SUBMIT";
export const ASK_PENDING = "ask/PENDING";
export const ASK_SUCCESS = "ask/SUCCESS";
export const ASK_FAILURE = "ask/FAILURE";

export interface SubmitAskAction {
  type: typeof SUBMIT_ASK;
  payload: { question: string; includeWeb: boolean };
}

export interface AskPendingAction {
  type: typeof ASK_PENDING;
  payload: { userMessage: AskMessage; pendingAssistantId: string };
}

export interface AskSuccessAction {
  type: typeof ASK_SUCCESS;
  payload: { assistantId: string; answer: string; citations: UnifiedCitation[] };
}

export interface AskFailureAction {
  type: typeof ASK_FAILURE;
  payload: { assistantId: string; message: string };
}

export type AskAction = SubmitAskAction | AskPendingAction | AskSuccessAction | AskFailureAction;

export const submitAsk = (question: string, includeWeb: boolean): SubmitAskAction => ({
  type: SUBMIT_ASK,
  payload: { question, includeWeb },
});

export const askPending = (
  userMessage: AskMessage,
  pendingAssistantId: string
): AskPendingAction => ({
  type: ASK_PENDING,
  payload: { userMessage, pendingAssistantId },
});

export const askSuccess = (
  assistantId: string,
  answer: string,
  citations: UnifiedCitation[]
): AskSuccessAction => ({
  type: ASK_SUCCESS,
  payload: { assistantId, answer, citations },
});

export const askFailure = (assistantId: string, message: string): AskFailureAction => ({
  type: ASK_FAILURE,
  payload: { assistantId, message },
});
