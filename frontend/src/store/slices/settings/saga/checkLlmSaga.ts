import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryLlmHealthQuery } from "../../../../api/gql/graphql";
import { QueryLlmHealthDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifySuccess, notifyWarning } from "../../notifications";
import { CHECK_LLM, checkLlmDone } from "../actions";

export function* checkLlmSaga(): SagaIterator {
  let ok = false;
  try {
    const result = (yield* gqlRequest(QueryLlmHealthDocument, {})) as QueryLlmHealthQuery;
    ok = result.llmHealth.available;
  } catch {
    ok = false;
  }
  if (ok) {
    yield put(notifySuccess({ messageKey: "settings.llmCheckSuccessToast" }));
  } else {
    yield put(notifyWarning({ messageKey: "settings.llmCheckFailureToast" }));
  }
  yield put(checkLlmDone());
}

export function* watchCheckLlm(): SagaIterator {
  yield takeLatest(CHECK_LLM, checkLlmSaga);
}
