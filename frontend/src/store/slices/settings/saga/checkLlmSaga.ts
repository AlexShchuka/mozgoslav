import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import { CHECK_LLM, checkLlmResult } from "../actions";

export function* checkLlmSaga(): SagaIterator {
  const healthApi = apiFactory.createHealthApi();
  try {
    const ok: boolean = yield call([healthApi, healthApi.checkLlm]);
    yield put(checkLlmResult(ok));
  } catch {
    yield put(checkLlmResult(false));
  }
}

export function* watchCheckLlm(): SagaIterator {
  yield takeLatest(CHECK_LLM, checkLlmSaga);
}
