import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../api";
import {
  ASK_QUESTION,
  askFailure,
  askPending,
  askSuccess,
  type AskQuestionAction,
} from "./actions";
import type { RagAnswer, RagMessage } from "./types";

// Keep seam exposed so tests can stub ID generation. Saga production path uses
// crypto.randomUUID (available in both Node ≥ 20 and every Chromium-based
// Electron renderer we ship against).
export const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `rag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function* askQuestionSaga(action: AskQuestionAction): SagaIterator {
  const { question, topK } = action.payload;

  const userMessage: RagMessage = {
    id: newId(),
    role: "user",
    content: question,
    citations: [],
    state: "done",
    llmAvailable: true,
  };
  const pendingAssistantId: string = newId();
  yield put(askPending(userMessage, pendingAssistantId));

  try {
    const ragApi = apiFactory.createRagApi();
    const answer: RagAnswer = yield call([ragApi, ragApi.query], question, topK);
    yield put(askSuccess(pendingAssistantId, answer));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(askFailure(pendingAssistantId, message));
  }
}

export function* watchRagSagas(): SagaIterator {
  yield takeLatest(ASK_QUESTION, askQuestionSaga);
}
