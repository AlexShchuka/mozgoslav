import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchDictationStart } from "./dictationStartSaga";
import { watchDictationStop } from "./dictationStopSaga";
import { watchDictationCancel } from "./dictationCancelSaga";

export function* watchDictationSagas(): SagaIterator {
  yield all([fork(watchDictationStart), fork(watchDictationStop), fork(watchDictationCancel)]);
}
