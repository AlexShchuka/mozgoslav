import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchRecordingSagas } from "./slices/recording";
import { watchSyncSagas } from "./slices/sync";
import { watchRagSagas } from "./slices/rag";

export function* rootSaga(): SagaIterator {
  yield all([fork(watchRecordingSagas), fork(watchSyncSagas), fork(watchRagSagas)]);
}
