import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationRagReindexMutation } from "../../../../api/gql/graphql";
import { MutationRagReindexDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import { REINDEX_RAG, reindexRagFailure, reindexRagSuccess, loadRagStatus } from "../actions";

export function* reindexRagSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(MutationRagReindexDocument, {})) as MutationRagReindexMutation;
    const embeddedNotes = data.ragReindex.embeddedNotes ?? 0;
    yield put(reindexRagSuccess(embeddedNotes));
    yield put(
      notifySuccess({ messageKey: "rag.reindexedToast", params: { count: embeddedNotes } })
    );
    yield put(loadRagStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(reindexRagFailure(message));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchReindexRag(): SagaIterator {
  yield takeLatest(REINDEX_RAG, reindexRagSaga);
}
