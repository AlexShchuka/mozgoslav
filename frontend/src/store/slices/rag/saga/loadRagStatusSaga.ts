import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryRagStatusQuery } from "../../../../api/gql/graphql";
import { QueryRagStatusDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { LOAD_RAG_STATUS, loadRagStatusFailure, loadRagStatusSuccess } from "../actions";

export function* loadRagStatusSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(QueryRagStatusDocument, {})) as QueryRagStatusQuery;
    yield put(
      loadRagStatusSuccess({
        embeddedNotes: data.ragStatus.embeddedNotes,
        chunks: data.ragStatus.chunks,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(loadRagStatusFailure(message));
  }
}

export function* watchLoadRagStatus(): SagaIterator {
  yield takeLatest(LOAD_RAG_STATUS, loadRagStatusSaga);
}
