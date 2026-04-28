import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { parse } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import { gqlRequest } from "../../saga/graphql";
import { SUBMIT_ASK, askFailure, askPending, askSuccess, type SubmitAskAction } from "./actions";
import type { AskMessage, UnifiedCitation } from "../../../features/Ask/types";

const UNIFIED_SEARCH_QUERY = `
  query UnifiedSearch($query: String!, $includeWeb: Boolean) {
    unifiedSearch(query: $query, includeWeb: $includeWeb) {
      answer
      citations {
        source
        reference
        snippet
        url
      }
    }
  }
`;

interface UnifiedSearchResult {
  unifiedSearch: {
    answer: string;
    citations: Array<{
      source: string;
      reference: string;
      snippet: string;
      url: string | null;
    }>;
  };
}

const UnifiedSearchDocument = parse(UNIFIED_SEARCH_QUERY) as TypedDocumentNode<
  UnifiedSearchResult,
  { query: string; includeWeb: boolean }
>;

const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `ask-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function* submitAskSaga(action: SubmitAskAction): SagaIterator {
  const { question, includeWeb } = action.payload;

  const userMessage: AskMessage = {
    id: newId(),
    role: "user",
    content: question,
    citations: [],
    state: "done",
  };
  const pendingAssistantId = newId();
  yield put(askPending(userMessage, pendingAssistantId));

  try {
    const data = (yield* gqlRequest(UnifiedSearchDocument, {
      query: question,
      includeWeb,
    })) as UnifiedSearchResult;

    const result = data.unifiedSearch;
    const citations: UnifiedCitation[] = result.citations.map((c) => ({
      source: c.source as UnifiedCitation["source"],
      reference: c.reference,
      snippet: c.snippet,
      url: c.url,
    }));

    yield put(askSuccess(pendingAssistantId, result.answer, citations));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(askFailure(pendingAssistantId, message));
  }
}

export function* watchAskSagas(): SagaIterator {
  yield takeLatest(SUBMIT_ASK, submitAskSaga);
}
