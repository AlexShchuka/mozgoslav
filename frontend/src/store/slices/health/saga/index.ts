import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchHealthSaga } from "./healthSaga";

export { healthProbeSaga } from "./healthSaga";

export function* watchHealthSagas(): SagaIterator {
  yield all([fork(watchHealthSaga)]);
}
