import { call, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import { CANCEL_JOB, type CancelJobAction } from "../actions";

export function* cancelJobSaga(action: CancelJobAction): SagaIterator {
  const api = apiFactory.createJobsApi();
  try {
    yield call([api, api.cancel], action.payload.jobId);
  } catch {}
}

export function* watchCancelJob(): SagaIterator {
  yield takeEvery(CANCEL_JOB, cancelJobSaga);
}
