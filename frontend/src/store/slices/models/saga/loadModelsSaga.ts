import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { QueryModelsQuery } from "../../../../api/gql/graphql";
import { QueryModelsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError } from "../../notifications";
import { LOAD_MODELS, loadModelsFailure, loadModelsSuccess } from "../actions";

function* loadModelsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryModelsDocument, {})) as QueryModelsQuery;
    yield put(loadModelsSuccess(result.models));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    yield put(loadModelsFailure(msg));
    yield put(
      notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: msg } })
    );
  }
}

export function* watchLoadModels(): SagaIterator {
  yield takeLatest(LOAD_MODELS, loadModelsSaga);
}
