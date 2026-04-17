import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchRecordingSagas } from "./slices/recording";
import { watchSyncSagas } from "./slices/sync";

export function* rootSaga(): SagaIterator {
  yield all([fork(watchRecordingSagas), fork(watchSyncSagas)]);
}
