import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { QueryRagDocument } from "../../../../api/gql/graphql";
import type { QueryRagQuery } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  ASK_QUESTION,
  askFailure,
  askPending,
  type AskQuestionAction,
  askSuccess,
} from "../actions";
import type { RagAnswer, RagMessage } from "../types";

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
    const data = (yield* gqlRequest(QueryRagDocument, { question, topK })) as QueryRagQuery;
    const result = data.ragQuery;
    if (!result) {
      yield put(askFailure(pendingAssistantId, "No result returned"));
      return;
    }
    const answer: RagAnswer = {
      answer: result.answer,
      citations: result.citations.map((c) => ({
        noteId: c.noteId,
        chunkId: c.segmentId,
        text: c.text,
        score: 0,
      })),
      llmAvailable: result.llmAvailable,
    };
    yield put(askSuccess(pendingAssistantId, answer));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(askFailure(pendingAssistantId, message));
  }
}

export function* watchAskQuestion(): SagaIterator {
  yield takeLatest(ASK_QUESTION, askQuestionSaga);
}
