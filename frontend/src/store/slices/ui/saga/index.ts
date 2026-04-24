import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchOpenNoteSagas } from "./openNoteSaga";

export function* watchUiSagas(): SagaIterator {
  yield all([fork(watchOpenNoteSagas)]);
}
