import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchRecordingSagas } from "./slices/recording";

export function* rootSaga(): SagaIterator {
  yield all([fork(watchRecordingSagas)]);
}
