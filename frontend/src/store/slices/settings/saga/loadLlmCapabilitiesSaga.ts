import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryLlmCapabilitiesQuery } from "../../../../api/gql/graphql";
import { QueryLlmCapabilitiesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { LOAD_LLM_CAPABILITIES, loadLlmCapabilitiesSuccess } from "../actions";

export function* loadLlmCapabilitiesSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      QueryLlmCapabilitiesDocument,
      {}
    )) as QueryLlmCapabilitiesQuery;
    yield put(loadLlmCapabilitiesSuccess(result.llmCapabilities ?? null));
  } catch {
    yield put(loadLlmCapabilitiesSuccess(null));
  }
}

export function* watchLoadLlmCapabilities(): SagaIterator {
  yield takeLatest(LOAD_LLM_CAPABILITIES, loadLlmCapabilitiesSaga);
}
