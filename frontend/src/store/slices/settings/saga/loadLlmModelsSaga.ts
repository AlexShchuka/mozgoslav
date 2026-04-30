import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryLlmModelsQuery } from "../../../../api/gql/graphql";
import { QueryLlmModelsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { LOAD_LLM_MODELS_REQUESTED, loadLlmModelsFailed, loadLlmModelsSucceeded } from "../actions";

export function* loadLlmModelsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryLlmModelsDocument, {})) as QueryLlmModelsQuery;
    yield put(loadLlmModelsSucceeded(result.llmModels));
  } catch {
    yield put(loadLlmModelsFailed());
  }
}

export function* watchLoadLlmModels(): SagaIterator {
  yield takeLatest(LOAD_LLM_MODELS_REQUESTED, loadLlmModelsSaga);
}
